//
// Copyright 2020-2022 Perforce Software
//
import * as assert from 'node:assert'
import { Request } from 'helix-auth-svc/lib/features/login/domain/entities/Request.js'
import { RequestRepository } from 'helix-auth-svc/lib/features/login/domain/repositories/RequestRepository.js'

//
// Implementation of the request repository that uses redis key/value store.
//
class RedisRequestRepository extends RequestRepository {
  constructor ({ redisConnector, cacheTtl }) {
    super()
    this.cacheTtl = cacheTtl
    this.connector = redisConnector
  }

  add (uniqueId, requestModel) {
    assert.ok(uniqueId, 'redis add: unique identifier must be defined')
    assert.ok(requestModel, 'redis add: request model must be defined')
    const key = makeKey(uniqueId)
    this.connector.set(key, requestModel.toJson())
    this.connector.client().pexpire(key, this.cacheTtl)
  }

  get (uniqueId) {
    assert.ok(uniqueId, 'redis get: unique identifier must be defined')
    const key = makeKey(uniqueId)
    return this.connector.get(key).then((reply) => {
      return reply ? Request.fromJson(reply) : null
    })
  }
}

// Add a namespace prefix to the unique identifier. 
function makeKey (uniqueId) {
  return 'req-' + uniqueId
}

export { RedisRequestRepository }
