//
// Copyright 2020 Perforce Software
//
const { AssertionError } = require('assert')
const { assert } = require('chai')
const { after, before, describe, it } = require('mocha')
const sinon = require('sinon')
const ReceiveUserProfile = require('@login/domain/usecases/ReceiveUserProfile')
const UserRepository = require('@login/domain/repositories/UserRepository')

describe('ReceiveUserProfile use case', function () {
  let usecase

  before(function () {
    const userRepository = new UserRepository()
    usecase = ReceiveUserProfile({ userRepository })
  })

  after(function () {
    sinon.restore()
  })

  it('should raise an error for invalid input', function () {
    assert.throws(() => ReceiveUserProfile({ userRepository: null }), AssertionError)
    assert.throws(() => usecase(null), AssertionError)
    assert.throws(() => usecase('joe', null), AssertionError)
  })

  it('should create a user entity', function () {
    // arrange
    const stub = sinon.stub(UserRepository.prototype, 'add')
    // act
    const user = usecase('joe', { name: 'Joe', email: 'joe@example.com' })
    // assert
    assert.isNotNull(user.id)
    assert.property(user.profile, 'email')
    assert.isTrue(stub.calledOnce)
    stub.restore()
  })
})
