//
// Copyright 2026 Perforce Software
//
import { assert } from 'chai'
import { describe, it } from 'mocha'
import HashPassword from 'helix-auth-svc/lib/common/domain/usecases/HashPassword.js'
import VerifyPassword from 'helix-auth-svc/lib/common/domain/usecases/VerifyPassword.js'

describe('VerifyPassword use case', function () {
  const hashPassword = HashPassword()
  const verifyPassword = VerifyPassword()

  it('should accept a matching hashed password', function () {
    const stored = hashPassword('tiger')
    assert.isTrue(verifyPassword('tiger', stored))
  })

  it('should reject a non-matching hashed password', function () {
    const stored = hashPassword('tiger')
    assert.isFalse(verifyPassword('wrongpass', stored))
  })

  it('should accept a matching legacy plaintext password', function () {
    assert.isTrue(verifyPassword('tiger', 'tiger'))
  })

  it('should reject a non-matching legacy plaintext password', function () {
    assert.isFalse(verifyPassword('wrongpass', 'tiger'))
  })

  it('should tolerate trailing whitespace in the stored value', function () {
    const stored = hashPassword('tiger')
    assert.isTrue(verifyPassword('tiger', `${stored}\n`))
  })

  it('should reject a malformed hashed value rather than throw', function () {
    assert.isFalse(verifyPassword('tiger', 'nothex\tnothex'))
  })
})
