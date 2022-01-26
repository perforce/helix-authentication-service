//
// Copyright 2020-2021 Perforce Software
//
import * as assert from 'node:assert'
import loki from 'lokijs'
import { User } from 'helix-auth-svc/lib/features/login/domain/entities/User.js'
import { UserRepository } from 'helix-auth-svc/lib/features/login/domain/repositories/UserRepository.js'

// eslint-disable-next-line new-cap
const db = new loki('login-resources.db')
const users = db.addCollection('users', { indices: ['key'] })

//
// Implementation of the user repository that uses an in-memory data store.
//
class InMemoryUserRepository extends UserRepository {
  constructor ({ cacheTtl }) {
    super()
    users.setTTL(cacheTtl, cacheTtl / 2)
  }

  add (userIdentifier, userModel) {
    assert.ok(userIdentifier, 'memory add: user identifier must be defined')
    assert.ok(userModel, 'user entity/model must be defined')
    const record = Object.assign({}, userModel, { key: userIdentifier })
    users.insert(record)
  }

  take (userIdentifier) {
    assert.ok(userIdentifier, 'memory take: user identifier must be defined')
    const record = users.findOne({ key: userIdentifier })
    if (record) {
      users.findAndRemove({ key: userIdentifier })
      const tUser = new User(record._id, record._profile)
      return Promise.resolve(tUser)
    }
    return Promise.resolve(null)
  }
}

export { InMemoryUserRepository }
