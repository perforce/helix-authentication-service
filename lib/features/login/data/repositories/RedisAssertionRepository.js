//
// Copyright 2026 Perforce Software
//
import * as assert from 'node:assert'
import { AssertionRepository } from 'helix-auth-svc/lib/features/login/domain/repositories/AssertionRepository.js'

//
// Implementation of the assertion repository that uses Redis, such that an
// assertion accepted by one instance of the service is rejected by all others.
//
class RedisAssertionRepository extends AssertionRepository {
  constructor ({ redisConnector }) {
    super()
    this.connector = redisConnector
  }

  consume (assertionId, expiresAt) {
    assert.ok(assertionId, 'redis consume: assertion identifier must be defined')
    assert.ok(Number.isFinite(expiresAt), 'redis consume: expiration must be a number')
    // keep the entry for at least a second, even if the assertion is about
    // to expire, as Redis rejects a non-positive expiration
    const ttl = Math.max(expiresAt - Date.now(), 1000)
    // redisConnector is registered as an async factory (HAS-706)
    return Promise.resolve(this.connector).then(async (connector) => {
      // SET with NX is atomic, so exactly one caller sees 'OK'
      const reply = await connector.client().set(makeKey(assertionId), '1', {
        condition: 'NX',
        expiration: { type: 'PX', value: ttl }
      })
      return reply === 'OK'
    })
  }
}

// Add a namespace prefix to the assertion identifier.
function makeKey (assertionId) {
  return 'saml-assertion-' + assertionId
}

export { RedisAssertionRepository }
