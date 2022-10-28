//
// Copyright 2021 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { describe, it } from 'mocha'
import { User } from 'helix-auth-svc/lib/features/scim/domain/entities/User.js'

describe('User entity', function () {
  it('should raise an error for invalid input', function () {
    assert.throws(() => new User(null), AssertionError)
    assert.throws(() => new User('foo', null), AssertionError)
    assert.throws(() => new User('foo', 'bar', null), AssertionError)
  })

  it('should return expected property values', function () {
    // arrange
    const tUser = new User('joeuser', 'joeuser@example.com', 'Joe Q. User')
    // assert
    assert.equal(tUser.id, 'user-joeuser')
    assert.equal(tUser.username, 'joeuser')
    assert.equal(tUser.email, 'joeuser@example.com')
    assert.equal(tUser.fullname, 'Joe Q. User')
    assert.isTrue(tUser.active)
    assert.isNull(tUser.password)
  })

  it('should convert email usernames to p4 usernames', function () {
    // arrange
    const tUser = new User('susan@example.com', 'susan@example.com', 'Susan Winters')
    // assert
    assert.equal(tUser.username, 'susan')
    assert.equal(tUser.email, 'susan@example.com')
    assert.equal(tUser.fullname, 'Susan Winters')
  })

  it('should produce identical clones', function () {
    // arrange
    const original = new User('susan', 'susan@example.com', 'Susan Winters')
    original.active = false
    original.externalId = 'swinters'
    original.password = 'Secret!23'
    const cloned = original.clone()
    // assert
    assert.isFalse(original === cloned)
    assert.isTrue(original.equals(cloned))
    assert.isFalse(cloned.active)
    assert.equal(cloned.password, 'Secret!23')
    assert.equal(cloned.externalId, 'swinters')
  })

  it('should treat identical users as equal', function () {
    // arrange
    const original = new User('susan', 'susan@example.com', 'Susan Winters')
    const cloned = new User('susan', 'susan@example.com', 'Susan Winters')
    // assert
    assert.isTrue(original.equals(cloned))
  })

  it('should notice changed username', function () {
    // arrange
    const original = new User('susan', 'susan@example.com', 'Susan Winters')
    const patched = new User('swinters', 'susan@example.com', 'Susan Winters')
    // assert
    assert.isFalse(original.equals(patched))
  })

  it('should notice changed userName', function () {
    // arrange
    const original = new User('susan', 'susan@example.com', 'Susan Winters')
    const patched = new User('susan@example.com', 'susan@example.com', 'Susan Winters')
    // assert
    assert.isFalse(original.equals(patched))
  })

  it('should notice changed user email', function () {
    // arrange
    const original = new User('susan', 'susan@example.com', 'Susan Winters')
    const patched = new User('susan', 'susieq@example.com', 'Susan Winters')
    // assert
    assert.isFalse(original.equals(patched))
  })

  it('should notice changed user full name', function () {
    // arrange
    const original = new User('susan', 'susan@example.com', 'Susan Winters')
    const patched = new User('susan', 'susan@example.com', 'Susan B. Winters')
    // assert
    assert.isFalse(original.equals(patched))
  })

  it('should notice changed active status', function () {
    // arrange
    const original = new User('susan', 'susan@example.com', 'Susan Winters')
    // act
    const inactive = new User('susan', 'susan@example.com', 'Susan Winters')
    inactive.active = false
    // assert
    assert.isFalse(original.equals(inactive))
  })

  it('should notice changed user password', function () {
    // arrange
    const original = new User('susan', 'susan@example.com', 'Susan Winters')
    // act
    const addPassword = new User('susan', 'susan@example.com', 'Susan B. Winters')
    addPassword.password = 'Secret123'
    // assert
    assert.isFalse(original.equals(addPassword))
    // act
    original.password = 'passw0rd!'
    const setPassword = new User('susan', 'susan@example.com', 'Susan B. Winters')
    setPassword.password = 'Secret123'
    // assert
    assert.isFalse(original.equals(setPassword))
  })
})
