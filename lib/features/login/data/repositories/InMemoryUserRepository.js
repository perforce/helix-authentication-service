//
// Copyright 2020-2021 Perforce Software
//
import * as assert from 'node:assert'
import { newCache } from 'transitory'
import { UserRepository } from 'helix-auth-svc/lib/features/login/domain/repositories/UserRepository.js'

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
class InMemoryUserRepository extends UserRepository {
  add (userIdentifier, userModel) {
    assert.ok(userIdentifier, 'memory add: user identifier must be defined')
    assert.ok(userModel, 'user entity/model must be defined')
    users.set(userIdentifier, userModel)
  }

  take (userIdentifier) {
    assert.ok(userIdentifier, 'memory take: user identifier must be defined')
    if (users.has(userIdentifier)) {
      return Promise.resolve(users.delete(userIdentifier))
    }
    return Promise.resolve(null)
  }
}

export { InMemoryUserRepository }
