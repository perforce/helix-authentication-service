//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'
import * as fs from 'node:fs'
import { createClient, createSentinel } from 'redis'
import { KeyValueConnector } from 'helix-auth-svc/lib/features/login/domain/connectors/KeyValueConnector.js'

//
// Implementation of the Redis connector.
//
class RedisConnector extends KeyValueConnector {
  constructor ({ redisSentinel, settingsRepository, loadAuthorityCerts }) {
    assert.ok(redisSentinel, 'redis: redisSentinel must be defined')
    assert.ok(settingsRepository, 'redis: settingsRepository must be defined')
    assert.ok(loadAuthorityCerts, 'redis: loadAuthorityCerts must be defined')
    super()
    const url = settingsRepository.get('REDIS_URL')
    if (url) {
      this._client = buildUrlClient(url, settingsRepository, loadAuthorityCerts)
      this._client.on('error', (err) => {
        console.error(err)
      })
      // Unlike ioredis, node-redis clients do not connect automatically on
      // the first command. Commands issued before connect() resolves are
      // queued (as long as connect() has already been invoked), so it is
      // safe not to await this here (HAS-652).
      this.ready = this._client.connect().catch((err) => {
        console.error(err)
      })
    } else {
      // Resolving the Sentinel configuration is inherently asynchronous (it
      // may need to dynamically import() the SENTINEL_CONFIG module and read
      // TLS cert files), so unlike the REDIS_URL branch above, the real
      // client cannot be constructed synchronously here. `ready` resolves
      // once the client exists and is connected; container.js awaits it
      // before handing this connector out to any consumer, so client() is
      // never called before it is actually ready (HAS-706).
      this.ready = redisSentinel().then((config) => {
        this._client = createSentinel(buildSentinelOptions(config))
        this._client.on('error', (err) => {
          console.error(err)
        })
        return this._client.connect()
      }).catch((err) => {
        console.error(err)
      })
    }
  }

  client () {
    return this._client
  }

  set (key, value) {
    assert.ok(key, 'redcon-set: key must be defined')
    assert.ok(value, 'redcon-set: value must be defined')
    this._client.set(key, value)
  }

  async get (key) {
    assert.ok(key, 'redcon-get: key must be defined')
    return this._client.get(key)
  }

  async take (key) {
    assert.ok(key, 'redcon-take: key must be defined')
    const reply = await this._client.get(key)
    if (reply !== null) {
      this._client.del(key)
    }
    return reply
  }
}

// Build the TLS options object used for a 'rediss://' connection, extracted
// from createRedisClient() for direct unit testing (HAS-681).
function buildRedisTlsOptions (settingsRepository, loadAuthorityCerts) {
  const redisCert = settingsRepository.get('REDIS_CERT_FILE')
  const redisKey = settingsRepository.get('REDIS_KEY_FILE')
  return {
    // Defaults to false (today's behavior) since customers overwhelmingly do
    // not have a properly signed certificate for their internal Redis
    // server; admins that do can opt in (HAS-681).
    rejectUnauthorized: settingsRepository.getBool('REDIS_REJECT_UNAUTHORIZED'),
    ca: loadAuthorityCerts(),
    cert: fs.readFileSync(redisCert),
    key: fs.readFileSync(redisKey)
  }
}

// Translate the ioredis-shaped Sentinel configuration -- the documented,
// customer-facing SENTINEL_CONFIG/sentinel.config.cjs format, which remains
// unchanged by this switch to node-redis -- into node-redis's createSentinel()
// option shape. The two are structurally unrelated (sentinels/tls/sentinelTLS
// vs. sentinelRootNodes/nodeClientOptions/sentinelClientOptions), so this
// mapping is required rather than a simple pass-through (HAS-652).
function buildSentinelOptions (sentinelConfig) {
  const options = {
    name: sentinelConfig.name,
    sentinelRootNodes: sentinelConfig.sentinels
  }
  const nodeClientOptions = {}
  if (sentinelConfig.password) {
    nodeClientOptions.password = sentinelConfig.password
  }
  if (sentinelConfig.tls) {
    nodeClientOptions.socket = {
      tls: true,
      ca: sentinelConfig.tls.ca,
      cert: sentinelConfig.tls.cert,
      key: sentinelConfig.tls.key,
      rejectUnauthorized: sentinelConfig.tls.rejectUnauthorized
    }
  }
  if (Object.keys(nodeClientOptions).length > 0) {
    options.nodeClientOptions = nodeClientOptions
  }
  const sentinelClientOptions = {}
  if (sentinelConfig.sentinelPassword) {
    sentinelClientOptions.password = sentinelConfig.sentinelPassword
  }
  if (sentinelConfig.enableTLSForSentinelMode && sentinelConfig.sentinelTLS) {
    sentinelClientOptions.socket = {
      tls: true,
      ca: sentinelConfig.sentinelTLS.ca,
      cert: sentinelConfig.sentinelTLS.cert,
      key: sentinelConfig.sentinelTLS.key,
      rejectUnauthorized: sentinelConfig.sentinelTLS.rejectUnauthorized
    }
  }
  if (Object.keys(sentinelClientOptions).length > 0) {
    options.sentinelClientOptions = sentinelClientOptions
  }
  return options
}

function buildUrlClient (url, settingsRepository, loadAuthorityCerts) {
  const options = { url }
  if (url.startsWith('rediss://')) {
    options.socket = { tls: true, ...buildRedisTlsOptions(settingsRepository, loadAuthorityCerts) }
  }
  return createClient(options)
}

export { RedisConnector, buildRedisTlsOptions, buildSentinelOptions }
