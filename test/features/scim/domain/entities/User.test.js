//
// Copyright 2021 Perforce Software
//
const { AssertionError } = require('assert')
const { assert } = require('chai')
const { describe, it } = require('mocha')
const path = require('path')

/* global include */
global.include = (p) => require(path.join(__dirname, '../../../../..', p))

const User = include('lib/features/scim/domain/entities/User')

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
    assert.equal(tUser.username, 'joeuser')
    assert.equal(tUser.email, 'joeuser@example.com')
    assert.equal(tUser.fullname, 'Joe Q. User')
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
    original.password = 'Secret!23'
    const cloned = original.clone()
    // assert
    assert.isFalse(original === cloned)
    assert.isTrue(original.equals(cloned))
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
