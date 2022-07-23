//
// Copyright 2022 Perforce Software
//
import * as assert from 'node:assert'
import loki from 'lokijs'
import { TokenRepository } from 'helix-auth-svc/lib/features/admin/domain/repositories/TokenRepository.js'

// eslint-disable-next-line new-cap
const db = new loki('admin-resources.db')
const tokens = db.addCollection('tokens', { indices: ['key'] })

//
// Implementation of the token repository that uses an in-memory store.
//
class InMemoryTokenRepository extends TokenRepository {
  constructor ({ tokenTtl }) {
    super()
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
    const record = tokens.findOne({ key: audience })
    if (record) {
      return Promise.resolve(record.secret)
    }
    return Promise.resolve(null)
  }

  delete (audience) {
    assert.ok(audience, 'token: audience must be defined')
    return Promise.resolve(tokens.findAndRemove({ key: audience }))
  }
}

export { InMemoryTokenRepository }
