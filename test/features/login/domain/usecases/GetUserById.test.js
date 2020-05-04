//
// Copyright 2020 Perforce Software
//
const { AssertionError } = require('assert')
const { assert } = require('chai')
const { after, before, describe, it } = require('mocha')
const sinon = require('sinon')
const User = require('@login/domain/entities/User')
const GetUserById = require('@login/domain/usecases/GetUserById')
const UserRepository = require('@login/domain/repositories/UserRepository')

describe('GetUserById use case', function () {
  let usecase

  before(function () {
    const userRepository = new UserRepository()
    usecase = GetUserById({ userRepository })
  })

  after(function () {
    sinon.restore()
  })

  it('should raise an error for invalid input', function () {
    assert.throws(() => GetUserById({ userRepository: null }), AssertionError)
    assert.throws(() => usecase(null), AssertionError)
  })

  it('should return null for a missing user entity', function () {
    // arrange
    const stub = sinon.stub(UserRepository.prototype, 'take').callsFake((id) => {
      return null
    })
    // act
    const user = usecase('123456')
    // assert
    assert.isNull(user)
    assert.isTrue(stub.calledOnce)
    stub.restore()
  })

  it('should find an existing user entity', function () {
    // arrange
    const tUser = new User('joeuser', { name: 'Joe', email: 'joeuser@example.com' })
    const stub = sinon.stub(UserRepository.prototype, 'take').callsFake((id) => {
      return tUser
    })
    // act
    const user = usecase(tUser.id)
    // assert
    assert.isNotNull(user.id)
    assert.equal(user.id, tUser.id)
    assert.equal(user.profile.name, 'Joe')
    assert.isTrue(stub.calledOnce)
    stub.restore()
  })
})
