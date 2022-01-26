//
// Copyright 2020-2021 Perforce Software
//
import * as assert from 'node:assert'
import { User } from 'helix-auth-svc/lib/features/login/domain/entities/User.js'
import { UserRepository } from 'helix-auth-svc/lib/features/login/domain/repositories/UserRepository.js'

//
// Implementation of the user repository that uses redis key/value store.
//
class RedisUserRepository extends UserRepository {
  constructor ({ redisConnector, cacheTtl }) {
    super()
    this.cacheTtl = cacheTtl
    this.connector = redisConnector
  }

  add (userIdentifier, userModel) {
    assert.ok(userIdentifier, 'redis add: user identifier must be defined')
    assert.ok(userModel, 'user entity/model must be defined')
    this.connector.set(userIdentifier, userModel.toJson())
    this.connector.client().pexpire(userIdentifier, this.cacheTtl)
  }

  take (userIdentifier) {
    assert.ok(userIdentifier, 'redis take: user identifier must be defined')
    return this.connector.take(userIdentifier).then((reply) => {
      return reply ? User.fromJson(reply) : null
    })
  }
}

export { RedisUserRepository }
