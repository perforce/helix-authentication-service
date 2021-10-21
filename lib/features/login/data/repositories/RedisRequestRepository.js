//
// Copyright 2020-2021 Perforce Software
//
import * as assert from 'node:assert'
import { Request } from 'helix-auth-svc/lib/features/login/domain/entities/Request.js'
import { RequestRepository } from 'helix-auth-svc/lib/features/login/domain/repositories/RequestRepository.js'
import * as redis from 'redis'

//
// Implementation of the request repository that uses redis key/value store.
//
class RedisRequestRepository extends RequestRepository {
  constructor ({ settingsRepository }) {
    super()
    const url = settingsRepository.get('REDIS_URL')
    this.client = redis.createClient({ url })
    this.client.on('error', (err) => {
      console.error(err)
    })
  }

  add (requestIdentifier, requestModel) {
    assert.ok(requestIdentifier, 'redis add: request identifier must be defined')
    assert.ok(requestModel, 'request entity/model must be defined')
    this.client.set(requestIdentifier, requestModel.toJson())
  }

  get (requestIdentifier) {
    assert.ok(requestIdentifier, 'redis get: request identifier must be defined')
    return new Promise((resolve, reject) => {
      this.client.get(requestIdentifier, (err, reply) => {
        if (err) {
          reject(err)
        } else {
          resolve(reply ? Request.fromJson(reply) : null)
        }
      })
    })
  }
}

export { RedisRequestRepository }
