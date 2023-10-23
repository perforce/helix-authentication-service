//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'
import * as fs from 'node:fs'
import redis from 'ioredis'
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
    this._client = createClient(
      { redisSentinel, settingsRepository, loadAuthorityCerts }
    )
    this._client.on('error', (err) => {
      console.error(err)
    })
  }

  client () {
    return this._client
  }

  set (key, value) {
    assert.ok(key, 'redcon-set: key must be defined')
    assert.ok(value, 'redcon-set: value must be defined')
    this._client.set(key, value)
  }

  get (key) {
    assert.ok(key, 'redcon-get: key must be defined')
    return new Promise((resolve, reject) => {
      this._client.get(key, (err, reply) => {
        if (err) {
          reject(err)
        } else {
          resolve(reply)
        }
      })
    })
  }

  take (key) {
    assert.ok(key, 'redcon-take: key must be defined')
    return new Promise((resolve, reject) => {
      this._client.get(key, (err, reply) => {
        if (err) {
          reject(err)
        } else {
          if (reply === null) {
            resolve(null)
          } else {
            this._client.del(key)
            resolve(reply)
          }
        }
      })
    })
  }
}

function createClient (
  { redisSentinel, settingsRepository, loadAuthorityCerts }
) {
  const url = settingsRepository.get('REDIS_URL')
  if (url) {
    const redisCert = settingsRepository.get('REDIS_CERT_FILE')
    const redisKey = settingsRepository.get('REDIS_KEY_FILE')
    const options = {}
    if (url.startsWith('rediss://')) {
      options.tls = {
        rejectUnauthorized: false,
        ca: loadAuthorityCerts(),
        cert: fs.readFileSync(redisCert),
        key: fs.readFileSync(redisKey)
      }
    }
    // eslint-disable-next-line new-cap
    return new redis(url, options)
  }
  // eslint-disable-next-line new-cap
  return new redis(redisSentinel())
}

export { RedisConnector }
