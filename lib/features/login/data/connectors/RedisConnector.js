//
// Copyright 2021 Perforce Software
//
import * as assert from 'node:assert'
import * as fs from 'node:fs'
import * as redis from 'redis'
import { KeyValueConnector } from 'helix-auth-svc/lib/features/login/domain/connectors/KeyValueConnector.js'

//
// Implementation of the Redis connector.
//
class RedisConnector extends KeyValueConnector {
  constructor ({ settingsRepository, loadAuthorityCerts, redisCert, redisKey }) {
    super()
    const url = settingsRepository.get('REDIS_URL')
    const options = {
      url
    }
    if (url.startsWith('rediss://')) {
      options.tls = {
        rejectUnauthorized: false,
        ca: loadAuthorityCerts(),
        cert: fs.readFileSync(redisCert),
        key: fs.readFileSync(redisKey)
      }
    }
    this._client = redis.createClient(options)
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
            this._client.unlink(key)
            resolve(reply)
          }
        }
      })
    })
  }
}

export { RedisConnector }
