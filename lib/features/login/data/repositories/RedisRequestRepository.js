//
// Copyright 2020-2021 Perforce Software
//
import * as assert from 'node:assert'
import { Request } from 'helix-auth-svc/lib/features/login/domain/entities/Request.js'
import { RequestRepository } from 'helix-auth-svc/lib/features/login/domain/repositories/RequestRepository.js'

//
// Implementation of the request repository that uses redis key/value store.
//
class RedisRequestRepository extends RequestRepository {
  constructor ({ redisConnector }) {
    super()
    this.connector = redisConnector
  }

  add (requestIdentifier, requestModel) {
    assert.ok(requestIdentifier, 'redis add: request identifier must be defined')
    assert.ok(requestModel, 'redis add: request model must be defined')
    this.connector.set(requestIdentifier, requestModel.toJson())
  }

  get (requestIdentifier) {
    assert.ok(requestIdentifier, 'redis get: request identifier must be defined')
    return this.connector.get(requestIdentifier).then((reply) => {
      return reply ? Request.fromJson(reply) : null
    })
  }
}

export { RedisRequestRepository }
