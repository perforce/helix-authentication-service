//
// Copyright 2023 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { afterEach, describe, it } from 'mocha'
import { DefaultsEnvRepository } from 'helix-auth-svc/lib/common/data/repositories/DefaultsEnvRepository.js'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'
import { MergedSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MergedSettingsRepository.js'
import LoadAuthorityCerts from 'helix-auth-svc/lib/common/domain/usecases/LoadAuthorityCerts.js'
import { RedisConnector, buildRedisTlsOptions, buildSentinelOptions } from 'helix-auth-svc/lib/features/login/data/connectors/RedisConnector.js'
import RedisSentinel from 'helix-auth-svc/lib/features/login/data/connectors/RedisSentinel.js'

describe('Redis connector', function () {
  const temporaryRepository = new MapSettingsRepository()
  const configuredRepository = new MapSettingsRepository()
  const defaultsRepository = new DefaultsEnvRepository()
  const settingsRepository = new MergedSettingsRepository({
    temporaryRepository,
    configuredRepository,
    defaultsRepository
  })
  const redisSentinel = RedisSentinel({ settingsRepository })
  const loadAuthorityCerts = LoadAuthorityCerts({ settingsRepository })

  afterEach(function () {
    temporaryRepository.clear()
  })

  it('should raise an error for invalid input', function () {
    assert.throws(() => new RedisConnector({
      redisSentinel: null,
      settingsRepository: {},
      loadAuthorityCerts: {}
    }), AssertionError)
    assert.throws(() => new RedisConnector({
      redisSentinel: {},
      settingsRepository: null,
      loadAuthorityCerts: {}
    }), AssertionError)
    assert.throws(() => new RedisConnector({
      redisSentinel: {},
      settingsRepository: {},
      loadAuthorityCerts: null
    }), AssertionError)
  })

  it('should return a non-TLS redis client', async function () {
    if (process.env.UNIT_ONLY) {
      this.skip()
    } else {
      temporaryRepository.set('REDIS_URL', 'redis://redis.doc:6379')
      const connector = new RedisConnector({ redisSentinel, settingsRepository, loadAuthorityCerts })
      assert.isNotNull(connector.client())
      await connector.set('RCU-TEST', 'some value')
      const actual = await connector.get('RCU-TEST')
      assert.equal(actual, 'some value')
    }
  })

  it('should return a TLS-enabled redis client', async function () {
    if (process.env.UNIT_ONLY) {
      this.skip()
    } else {
      temporaryRepository.set('REDIS_URL', 'rediss://redis.doc:6389')
      const connector = new RedisConnector({ redisSentinel, settingsRepository, loadAuthorityCerts })
      assert.isNotNull(connector.client())
      await connector.set('RCU-TLS-TEST', 'some TLS value')
      const actual = await connector.get('RCU-TLS-TEST')
      assert.equal(actual, 'some TLS value')
    }
  })

  it('should await the sentinel config before constructing the client (HAS-706)', async function () {
    let resolveConfig
    const configPromise = new Promise((resolve) => { resolveConfig = resolve })
    const fakeRedisSentinel = () => configPromise
    const connector = new RedisConnector({ redisSentinel: fakeRedisSentinel, settingsRepository, loadAuthorityCerts })
    // the client must not exist yet since the sentinel config has not resolved
    assert.isUndefined(connector.client())
    resolveConfig({ name: 'mymaster', sentinels: [{ host: '127.0.0.1', port: 1 }] })
    // Give the config-resolution handler a chance to run (it synchronously
    // constructs the client before awaiting connect(), which is what this
    // test cares about -- not waiting for a real Sentinel connection, which
    // this fake config does not point at).
    await new Promise((resolve) => setImmediate(resolve))
    assert.isDefined(connector.client())
    // stop the client's background reconnect attempts against the
    // unreachable fake address rather than leaving them running for the
    // remainder of the test process
    connector.client().destroy()
  })

  describe('buildRedisTlsOptions', function () {
    function makeSettings () {
      const repo = new MapSettingsRepository()
      repo.set('REDIS_CERT_FILE', 'test/fixtures/certificate.txt')
      repo.set('REDIS_KEY_FILE', 'test/fixtures/privatekey.txt')
      return repo
    }

    it('should default rejectUnauthorized to false', function () {
      const repo = makeSettings()
      const certs = LoadAuthorityCerts({ settingsRepository: repo })
      const options = buildRedisTlsOptions(repo, certs)
      assert.isFalse(options.rejectUnauthorized)
    })

    it('should honor REDIS_REJECT_UNAUTHORIZED when set to true', function () {
      const repo = makeSettings()
      repo.set('REDIS_REJECT_UNAUTHORIZED', 'true')
      const certs = LoadAuthorityCerts({ settingsRepository: repo })
      const options = buildRedisTlsOptions(repo, certs)
      assert.isTrue(options.rejectUnauthorized)
    })
  })

  describe('buildSentinelOptions', function () {
    it('should translate the minimal ioredis-shaped config', function () {
      const options = buildSentinelOptions({
        name: 'mymaster',
        sentinels: [{ host: '192.168.56.31', port: 26379 }]
      })
      assert.equal(options.name, 'mymaster')
      assert.sameDeepMembers(options.sentinelRootNodes, [{ host: '192.168.56.31', port: 26379 }])
      assert.isUndefined(options.nodeClientOptions)
      assert.isUndefined(options.sentinelClientOptions)
    })

    it('should translate sentinelPassword to sentinelClientOptions.password', function () {
      const options = buildSentinelOptions({
        name: 'mymaster',
        sentinels: [{ host: '192.168.56.31', port: 26379 }],
        sentinelPassword: 'keyboard cat'
      })
      assert.propertyVal(options.sentinelClientOptions, 'password', 'keyboard cat')
    })

    it('should translate password to nodeClientOptions.password', function () {
      const options = buildSentinelOptions({
        name: 'mymaster',
        sentinels: [{ host: '192.168.56.31', port: 26379 }],
        password: 'woof woof'
      })
      assert.propertyVal(options.nodeClientOptions, 'password', 'woof woof')
    })

    it('should translate tls to nodeClientOptions.socket', function () {
      const options = buildSentinelOptions({
        name: 'mymaster',
        sentinels: [{ host: '192.168.56.31', port: 26379 }],
        tls: { cert: 'cert-contents', key: 'key-contents', ca: ['ca-contents'], rejectUnauthorized: false }
      })
      assert.isTrue(options.nodeClientOptions.socket.tls)
      assert.equal(options.nodeClientOptions.socket.cert, 'cert-contents')
      assert.equal(options.nodeClientOptions.socket.key, 'key-contents')
      assert.sameMembers(options.nodeClientOptions.socket.ca, ['ca-contents'])
      assert.isFalse(options.nodeClientOptions.socket.rejectUnauthorized)
    })

    it('should translate sentinelTLS to sentinelClientOptions.socket only when enabled', function () {
      const withoutFlag = buildSentinelOptions({
        name: 'mymaster',
        sentinels: [{ host: '192.168.56.31', port: 26379 }],
        sentinelTLS: { cert: 'cert-contents', key: 'key-contents', ca: ['ca-contents'], rejectUnauthorized: false }
      })
      assert.isUndefined(withoutFlag.sentinelClientOptions)

      const withFlag = buildSentinelOptions({
        name: 'mymaster',
        sentinels: [{ host: '192.168.56.31', port: 26379 }],
        enableTLSForSentinelMode: true,
        sentinelTLS: { cert: 'cert-contents', key: 'key-contents', ca: ['ca-contents'], rejectUnauthorized: false }
      })
      assert.isTrue(withFlag.sentinelClientOptions.socket.tls)
      assert.equal(withFlag.sentinelClientOptions.socket.cert, 'cert-contents')
      assert.equal(withFlag.sentinelClientOptions.socket.key, 'key-contents')
      assert.sameMembers(withFlag.sentinelClientOptions.socket.ca, ['ca-contents'])
      assert.isFalse(withFlag.sentinelClientOptions.socket.rejectUnauthorized)
    })
  })
})
