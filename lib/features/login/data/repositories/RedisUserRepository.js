//
// Copyright 2020-2021 Perforce Software
//
import * as assert from 'node:assert'
import { User } from 'helix-auth-svc/lib/features/login/domain/entities/User.js'
import { UserRepository } from 'helix-auth-svc/lib/features/login/domain/repositories/UserRepository.js'
import * as redis from 'redis'

//
// Implementation of the user repository that uses redis key/value store.
//
class RedisUserRepository extends UserRepository {
  constructor ({ settingsRepository }) {
    super()
    const url = settingsRepository.get('REDIS_URL')
    this.client = redis.createClient({ url })
    this.client.on('error', (err) => {
      console.error(err)
    })
  }

  add (userIdentifier, userModel) {
    assert.ok(userIdentifier, 'redis add: user identifier must be defined')
    assert.ok(userModel, 'user entity/model must be defined')
    this.client.set(userIdentifier, userModel.toJson())
  }

  take (userIdentifier) {
    assert.ok(userIdentifier, 'redis take: user identifier must be defined')
    return new Promise((resolve, reject) => {
      this.client.get(userIdentifier, (err, reply) => {
        if (err) {
          reject(err)
        } else {
          if (reply === null) {
            resolve(null)
          } else {
            this.client.unlink(userIdentifier)
            resolve(User.fromJson(reply))
          }
        }
      })
    })
  }
}

export { RedisUserRepository }
