//
// Copyright 2020 Perforce Software
//
const assert = require('assert')
const { newCache } = require('transitory')
const UserRepository = require('@login/domain/repositories/UserRepository')

// Set up an in-memory cache of the user entities.
const users = newCache()
  .expireAfterWrite(60 * 60 * 1000)
  .expireAfterRead(5 * 60 * 1000)
  .build()
setInterval(() => users.cleanUp(), 5 * 60 * 1000)

//
// Implementation of the user repository that uses an in-memory data store.
//
// For now this is kept very simple, no models and no data sources, just plain
// JavaScript objects stored directly in an in-memory data store. If we were to
// introduce an on-disk data store (e.g. RocksDB), then model and data source
// implementations for serializing and deserializing would be prudent.
//
module.exports = class InMemoryUserRepository extends UserRepository {
  add (userIdentifier, userModel) {
    assert.ok(userIdentifier, 'user identifier must be defined')
    assert.ok(userModel, 'user entity/model must be defined')
    users.set(userIdentifier, userModel)
  }

  take (userIdentifier) {
    assert.ok(userIdentifier, 'user identifier must be defined')
    if (users.has(userIdentifier)) {
      return users.delete(userIdentifier)
    }
    return null
  }
}
