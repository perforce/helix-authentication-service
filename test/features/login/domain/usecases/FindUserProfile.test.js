//
// Copyright 2020 Perforce Software
//
const { AssertionError } = require('assert')
const { assert } = require('chai')
const { after, before, describe, it } = require('mocha')
const sinon = require('sinon')
const Request = require('@login/domain/entities/Request')
const User = require('@login/domain/entities/User')
const RequestRepository = require('@login/domain/repositories/RequestRepository')
const UserRepository = require('@login/domain/repositories/UserRepository')
const FindUserProfile = require('@login/domain/usecases/FindUserProfile')

describe('FindUserProfile use case', function () {
  let usecase

  before(function () {
    const userRepository = new UserRepository()
    const requestRepository = new RequestRepository()
    usecase = FindUserProfile({ requestRepository, userRepository })
  })

  after(function () {
    sinon.restore()
  })

  it('should raise an error for invalid input', function () {
    assert.throws(() => FindUserProfile({ requestRepository: null }), AssertionError)
    assert.throws(() => FindUserProfile({ requestRepository: 'foo', userRepository: null }), AssertionError)
    assert.throws(() => usecase(null), AssertionError)
  })

  it('should return null when missing request', async function () {
    // arrange
    const userStub = sinon.stub(UserRepository.prototype, 'take')
    const requestId = 'request123'
    const requestStub = sinon.stub(RequestRepository.prototype, 'get').callsFake((id) => {
      assert.equal(id, requestId)
      return null
    })
    // act
    const result = await usecase(requestId, 1000, 100)
    // assert
    assert.isNull(result)
    assert.isFalse(userStub.called)
    assert.isTrue(requestStub.calledOnce)
    userStub.restore()
    requestStub.restore()
  })

  it('should throw error after timeout when missing user entity', async function () {
    // arrange
    const userStub = sinon.stub(UserRepository.prototype, 'take').callsFake((id) => {
      assert.equal(id, 'joeuser')
      return null
    })
    const requestId = 'request123'
    const requestStub = sinon.stub(RequestRepository.prototype, 'get').callsFake((id) => {
      assert.equal(id, requestId)
      return new Request('request123', 'joeuser', false)
    })
    // act
    try {
      await usecase(requestId, 1000, 100)
      assert.fail('should have raised an error')
    } catch (err) {
      assert.instanceOf(err, Error)
    }
    // assert
    assert.isTrue(userStub.called)
    assert.isTrue(requestStub.calledOnce)
    userStub.restore()
    requestStub.restore()
  })

  it('should find an existing user entity immediately', async function () {
    // arrange
    const userId = 'joeuser'
    const userStub = sinon.stub(UserRepository.prototype, 'take').callsFake((id) => {
      assert.equal(id, userId)
      return new User(id, { name: 'joe', email: 'joe@example.com' })
    })
    const requestId = 'request123'
    const requestStub = sinon.stub(RequestRepository.prototype, 'get').callsFake((id) => {
      assert.equal(id, requestId)
      return new Request('request123', userId, false)
    })
    // act
    const user = await usecase(requestId)
    // assert
    assert.equal(user.id, userId)
    assert.property(user, 'profile')
    assert.property(user.profile, 'email')
    assert.isTrue(userStub.calledOnce)
    assert.isTrue(requestStub.calledOnce)
    userStub.restore()
    requestStub.restore()
  })

  it('should find an existing user entity eventually', async function () {
    // arrange
    const userId = 'joeuser'
    let callCount = 0
    const userStub = sinon.stub(UserRepository.prototype, 'take').callsFake((id) => {
      assert.equal(id, userId)
      // do not return the user object on the first call to force a different
      // path through the usecase code
      callCount++
      if (callCount > 3) {
        return new User(id, { name: 'joe', email: 'joe@example.com' })
      }
      return null
    })
    const requestId = 'request123'
    const requestStub = sinon.stub(RequestRepository.prototype, 'get').callsFake((id) => {
      assert.equal(id, requestId)
      return new Request('request123', userId, false)
    })
    // act
    const user = await usecase(requestId, 1000, 100)
    // assert
    assert.equal(user.id, userId)
    assert.property(user, 'profile')
    assert.property(user.profile, 'email')
    assert.isTrue(userStub.called)
    assert.isTrue(requestStub.calledOnce)
    userStub.restore()
    requestStub.restore()
  })
})
