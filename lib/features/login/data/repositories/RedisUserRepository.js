//
// Copyright 2020 Perforce Software
//
const assert = require('assert')
/* global include */
const User = include('lib/features/login/domain/entities/User')
const UserRepository = include('lib/features/login/domain/repositories/UserRepository')
const redis = require('redis')
const client = redis.createClient({ url: process.env.REDIS_URL })

client.on('error', (err) => {
  console.error(err)
})

//
// Implementation of the user repository that uses redis key/value store.
//
module.exports = class RedisUserRepository extends UserRepository {
  add (userIdentifier, userModel) {
    assert.ok(userIdentifier, 'redis add: user identifier must be defined')
    assert.ok(userModel, 'user entity/model must be defined')
    client.set(userIdentifier, userModel.toJson())
  }

  take (userIdentifier) {
    assert.ok(userIdentifier, 'redis take: user identifier must be defined')
    return new Promise((resolve, reject) => {
      client.get(userIdentifier, (err, reply) => {
        if (err) {
          reject(err)
        } else {
          if (reply === null) {
            resolve(null)
          } else {
            client.unlink(userIdentifier)
            resolve(User.fromJson(reply))
          }
        }
      })
    })
  }
}
