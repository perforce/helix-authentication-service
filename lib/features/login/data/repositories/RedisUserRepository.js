//
// Copyright 2020-2022 Perforce Software
//
import * as assert from 'node:assert'
import { User } from 'helix-auth-svc/lib/features/login/domain/entities/User.js'
import { UserRepository } from 'helix-auth-svc/lib/features/login/domain/repositories/UserRepository.js'

//
// Implementation of the user repository that uses Redis key/value store.
//
class RedisUserRepository extends UserRepository {
  constructor ({ redisConnector, cacheTtl }) {
    super()
    this.cacheTtl = cacheTtl
    this.connector = redisConnector
  }

  add (uniqueId, userModel) {
    assert.ok(uniqueId, 'redis add: unique identifier must be defined')
    assert.ok(userModel, 'redis add: user model must be defined')
    const key = makeKey(uniqueId)
    this.connector.set(key, userModel.toJson())
    this.connector.client().pexpire(key, this.cacheTtl)
  }

  take (uniqueId) {
    assert.ok(uniqueId, 'redis take: unique identifier must be defined')
    const key = makeKey(uniqueId)
    return this.connector.take(key).then((reply) => {
      return reply ? User.fromJson(reply) : null
    })
  }
}

// Add a namespace prefix to the unique identifier. 
function makeKey (uniqueId) {
  return 'user-' + uniqueId
}

export { RedisUserRepository }
