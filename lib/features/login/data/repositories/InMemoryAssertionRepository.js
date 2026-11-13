//
// Copyright 2026 Perforce Software
//
import * as assert from 'node:assert'
import { AssertionRepository } from 'helix-auth-svc/lib/features/login/domain/repositories/AssertionRepository.js'

// assertion identifier -> expiration time (ms since epoch)
const consumed = new Map()

//
// Implementation of the assertion repository that uses an in-memory store,
// suitable only for a single instance of the service.
//
class InMemoryAssertionRepository extends AssertionRepository {
  consume (assertionId, expiresAt) {
    assert.ok(assertionId, 'memory consume: assertion identifier must be defined')
    assert.ok(Number.isFinite(expiresAt), 'memory consume: expiration must be a number')
    const now = Date.now()
    // prune expired entries to keep the map bounded
    for (const [key, expiry] of consumed) {
      if (expiry <= now) {
        consumed.delete(key)
      }
    }
    if (consumed.has(assertionId)) {
      return Promise.resolve(false)
    }
    consumed.set(assertionId, expiresAt)
    return Promise.resolve(true)
  }
}

export { InMemoryAssertionRepository }
