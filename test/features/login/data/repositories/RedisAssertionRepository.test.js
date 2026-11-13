//
// Copyright 2026 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { describe, it } from 'mocha'
import { RedisAssertionRepository } from 'helix-auth-svc/lib/features/login/data/repositories/RedisAssertionRepository.js'

// Fake connector whose client implements SET with the NX condition.
function fakeConnector (calls) {
  const store = new Map()
  const client = {
    set: async (key, value, options) => {
      calls.push({ key, value, options })
      if (options.condition === 'NX' && store.has(key)) {
        return null
      }
      store.set(key, value)
      return 'OK'
    }
  }
  return { client: () => client }
}

describe('RedisAssertion repository', function () {
  it('should raise an error for invalid input', function () {
    const repository = new RedisAssertionRepository({ redisConnector: fakeConnector([]) })
    assert.throws(() => repository.consume(null, Date.now()), AssertionError)
    assert.throws(() => repository.consume('_abc', undefined), AssertionError)
  })

  it('should consume an assertion only once using SET NX', async function () {
    const calls = []
    // the connector is registered as an async factory, so may be a promise
    const repository = new RedisAssertionRepository({ redisConnector: Promise.resolve(fakeConnector(calls)) })
    const expiresAt = Date.now() + 60000
    assert.isTrue(await repository.consume('_once', expiresAt))
    assert.isFalse(await repository.consume('_once', expiresAt))
    assert.equal(calls[0].key, 'saml-assertion-_once')
    assert.equal(calls[0].options.condition, 'NX')
    assert.equal(calls[0].options.expiration.type, 'PX')
    assert.isAbove(calls[0].options.expiration.value, 50000)
  })

  it('should use a positive expiration for an expiring assertion', async function () {
    const calls = []
    const repository = new RedisAssertionRepository({ redisConnector: fakeConnector(calls) })
    assert.isTrue(await repository.consume('_expiring', Date.now() - 5000))
    assert.equal(calls[0].options.expiration.value, 1000)
  })
})
