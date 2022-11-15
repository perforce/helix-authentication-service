//
// Copyright 2020-2022 Perforce Software
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
  constructor({ settingsRepository }) {
    super()
    const cacheTtl = settingsRepository.getInt('CACHE_TTL') * 1000
    users.setTTL(cacheTtl, cacheTtl / 2)
  }

  add (uniqueId, userModel) {
    assert.ok(uniqueId, 'memory add: unique identifier must be defined')
    assert.ok(userModel, 'memory add: user model must be defined')
    const record = Object.assign({}, userModel, { key: uniqueId })
    users.insert(record)
  }

  take (uniqueId) {
    assert.ok(uniqueId, 'memory take: unique identifier must be defined')
    const record = users.findOne({ key: uniqueId })
    if (record) {
      users.findAndRemove({ key: uniqueId })
      const tUser = new User(record._id, record._profile)
      return Promise.resolve(tUser)
    }
    return Promise.resolve(null)
  }
}

export { InMemoryUserRepository }
