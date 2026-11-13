//
// Copyright 2022 Perforce Software
//
import * as assert from 'node:assert'
import loki from 'lokijs'
import { TokenRepository } from 'helix-auth-svc/lib/features/admin/domain/repositories/TokenRepository.js'

 
const db = new loki('admin-resources.db')
const tokens = db.addCollection('tokens', { indices: ['key'] })

//
// Implementation of the token repository that uses an in-memory store.
//
class InMemoryTokenRepository extends TokenRepository {
  constructor ({ settingsRepository }) {
    super()
    assert.ok(settingsRepository, 'settingsRepository is required')
    const tokenTtl = settingsRepository.getInt('TOKEN_TTL') * 1000
    tokens.setTTL(tokenTtl, tokenTtl / 2)
  }

  set (audience, secret) {
    assert.ok(audience, 'token: audience must be defined')
    assert.ok(secret, 'token: secret must be defined')
    const record = { key: audience, secret }
    tokens.insert(record)
  }

  get (audience) {
    assert.ok(audience, 'token: audience must be defined')
    // never let a non-string be interpreted as a query operator (HAS-732)
    assert.strictEqual(typeof audience, 'string', 'token: audience must be a string')
    const record = tokens.findOne({ key: audience })
    if (record) {
      return Promise.resolve(record.secret)
    }
    return Promise.resolve(null)
  }

  delete (audience) {
    assert.ok(audience, 'token: audience must be defined')
    // never let a non-string be interpreted as a query operator (HAS-732)
    assert.strictEqual(typeof audience, 'string', 'token: audience must be a string')
    return Promise.resolve(tokens.findAndRemove({ key: audience }))
  }
}

export { InMemoryTokenRepository }
