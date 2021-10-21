//
// Copyright 2020-2021 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { describe, it } from 'mocha'
import { User } from 'helix-auth-svc/lib/features/login/domain/entities/User.js'

describe('User entity', function () {
  it('should raise an error for invalid input', function () {
    assert.throws(() => new User(null), AssertionError)
    assert.throws(() => new User(null, null), AssertionError)
  })

  it('should return expected property values', function () {
    // arrange
    const tUser = new User('joeuser', { name: 'Joe' })
    // assert
    assert.equal(tUser.id, 'joeuser')
    assert.property(tUser.profile, 'name')
  })

  it('should convert to/from JSON', function () {
    // arrange
    const tUser = new User('joeuser', { name: 'Joe' })
    // act
    const encoded = tUser.toJson()
    const decoded = User.fromJson(encoded)
    // assert
    assert.equal(decoded.id, 'joeuser')
    assert.property(decoded.profile, 'name')
  })
})
