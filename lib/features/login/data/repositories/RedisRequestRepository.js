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
  constructor ({ redisConnector, settingsRepository }) {
    super()
    this.cacheTtl = settingsRepository.getInt('CACHE_TTL') * 1000
    this.connector = redisConnector
  }

  // redisConnector is registered as an async factory since resolving a Redis
  // Sentinel configuration is inherently asynchronous (HAS-706);
  // Promise.resolve() correctly adopts it whether or not it is already
  // resolved.
  _withConnector (fn) {
    return Promise.resolve(this.connector).then(fn)
  }

  // Not declared `async` so that the assert.ok() validation below still
  // throws synchronously, matching this class's existing contract -- an
  // `async` function would instead turn that throw into a silently unobserved
  // rejected Promise.
  add (uniqueId, requestModel) {
    assert.ok(uniqueId, 'redis add: unique identifier must be defined')
    assert.ok(requestModel, 'redis add: request model must be defined')
    const key = makeKey(uniqueId)
    return this._withConnector((connector) => {
      connector.set(key, requestModel.toJson())
      connector.client().pExpire(key, this.cacheTtl)
    })
  }

  get (uniqueId) {
    assert.ok(uniqueId, 'redis get: unique identifier must be defined')
    const key = makeKey(uniqueId)
    return this._withConnector((connector) => connector.get(key)).then((reply) => {
      return reply ? Request.fromJson(reply) : null
    })
  }
}

// Add a namespace prefix to the unique identifier. 
function makeKey (uniqueId) {
  return 'req-' + uniqueId
}

export { RedisRequestRepository }
