//
// Copyright 2020-2021 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { after, before, describe, it } from 'mocha'
import sinon from 'sinon'
import ReceiveUserProfile from 'helix-auth-svc/lib/features/login/domain/usecases/ReceiveUserProfile.js'
import { UserRepository } from 'helix-auth-svc/lib/features/login/domain/repositories/UserRepository.js'

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
    assert.throws(() => usecase('req-123', null), AssertionError)
    assert.throws(() => usecase('req-123', 'user-123', null), AssertionError)
  })

  it('should create a user entity', function () {
    // arrange
    const stub = sinon.stub(UserRepository.prototype, 'add')
    // act
    const user = usecase('req-123', 'user-123', { name: 'Joe', email: 'joe@example.com' })
    // assert
    assert.equal(user.id, 'user-123')
    assert.property(user.profile, 'email')
    assert.isTrue(stub.calledOnce)
    stub.restore()
  })
})
