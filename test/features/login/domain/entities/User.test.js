//
// Copyright 2020 Perforce Software
//
const { AssertionError } = require('assert')
const { assert } = require('chai')
const { describe, it } = require('mocha')
const User = require('@login/domain/entities/User')

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
})
