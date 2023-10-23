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
import { RedisConnector } from 'helix-auth-svc/lib/features/login/data/connectors/RedisConnector.js'
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
})
