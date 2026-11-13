//
// Copyright 2026 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { describe, it } from 'mocha'
import { InMemoryAssertionRepository } from 'helix-auth-svc/lib/features/login/data/repositories/InMemoryAssertionRepository.js'

describe('InMemoryAssertion repository', function () {
  const repository = new InMemoryAssertionRepository()

  it('should raise an error for invalid input', function () {
    assert.throws(() => repository.consume(null, Date.now()), AssertionError)
    assert.throws(() => repository.consume('_abc', undefined), AssertionError)
  })

  it('should consume an assertion only once', async function () {
    const expiresAt = Date.now() + 60000
    assert.isTrue(await repository.consume('_once', expiresAt))
    assert.isFalse(await repository.consume('_once', expiresAt))
    assert.isTrue(await repository.consume('_another', expiresAt))
  })

  it('should forget expired assertions', async function () {
    assert.isTrue(await repository.consume('_expired', Date.now() - 1))
    assert.isTrue(await repository.consume('_expired', Date.now() + 60000))
  })
})
