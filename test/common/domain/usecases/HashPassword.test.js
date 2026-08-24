//
// Copyright 2026 Perforce Software
//
import { assert } from 'chai'
import { describe, it } from 'mocha'
import HashPassword from 'helix-auth-svc/lib/common/domain/usecases/HashPassword.js'

describe('HashPassword use case', function () {
  const hashPassword = HashPassword()

  it('should produce a salt and hash separated by a tab', function () {
    const result = hashPassword('tiger')
    const parts = result.split('\t')
    assert.lengthOf(parts, 2)
    assert.match(parts[0], /^[0-9a-f]+$/)
    assert.match(parts[1], /^[0-9a-f]+$/)
  })

  it('should produce a different salt each time', function () {
    const first = hashPassword('tiger')
    const second = hashPassword('tiger')
    assert.notEqual(first, second)
  })
})
