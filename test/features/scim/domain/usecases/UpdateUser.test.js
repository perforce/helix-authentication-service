//
// Copyright 2021 Perforce Software
//
const { AssertionError } = require('assert')
const { assert } = require('chai')
const { after, before, describe, it } = require('mocha')
const sinon = require('sinon')
const path = require('path')

/* global include */
global.include = (p) => require(path.join(__dirname, '../../../../..', p))

const User = include('lib/features/scim/domain/entities/User')
const NoSuchUserError = include('lib/features/scim/domain/errors/NoSuchUserError')
const UpdateUser = include('lib/features/scim/domain/usecases/UpdateUser')
const EntityRepository = include('lib/features/scim/domain/repositories/EntityRepository')

describe('UpdateUser use case', function () {
  let usecase

  before(function () {
    const entityRepository = new EntityRepository()
    usecase = UpdateUser({ entityRepository: entityRepository })
  })

  after(function () {
    sinon.restore()
  })

  it('should raise an error for invalid input', async function () {
    assert.throws(() => UpdateUser({ entityRepository: null }), AssertionError)
    try {
      await usecase(null)
      assert.fail('should have raised error')
    } catch (err) {
      assert.instanceOf(err, AssertionError)
    }
    try {
      await usecase('username', null)
      assert.fail('should have raised error')
    } catch (err) {
      assert.instanceOf(err, AssertionError)
    }
  })

  it('should reject missing user entity', async function () {
    // arrange
    const getStub = sinon.stub(EntityRepository.prototype, 'getUser').callsFake((username) => {
      assert.equal(username, 'joeuser')
      return null
    })
    const addStub = sinon.stub(EntityRepository.prototype, 'updateUser').callsFake((user) => {
      assert.isNotNull(user)
      return null
    })
    // act
    try {
      const tUser = new User('joeuser', 'joeuser@example.com', 'Joe Q. User')
      await usecase('joeuser', tUser)
      assert.fail('should raise error')
    } catch (err) {
      assert.instanceOf(err, NoSuchUserError)
    }
    // assert
    assert.isTrue(getStub.calledOnce)
    assert.isTrue(addStub.notCalled)
    getStub.restore()
    addStub.restore()
  })

  it('should succeed when updating existing user entity', async function () {
    // arrange
    const tUser = new User('joeuser', 'joeuser@example.com', 'Joe Q. User')
    const getStub = sinon.stub(EntityRepository.prototype, 'getUser').callsFake((username) => {
      assert.equal(username, 'joeuser')
      return tUser
    })
    const updateStub = sinon.stub(EntityRepository.prototype, 'updateUser').callsFake((user) => {
      assert.isNotNull(user)
      return null
    })
    // act
    await usecase('joeuser', tUser)
    // assert
    assert.isTrue(getStub.calledOnce)
    assert.isTrue(updateStub.calledOnce)
    getStub.restore()
    updateStub.restore()
  })

  it('should support renaming an existing user entity', async function () {
    // arrange
    const getStub = sinon.stub(EntityRepository.prototype, 'getUser').callsFake((username) => {
      assert.equal(username, 'joeuser')
      return new User('joeuser', 'joeuser@example.com', 'Joe Q. User')
    })
    const renameStub = sinon.stub(EntityRepository.prototype, 'renameUser').callsFake((alt, neu) => {
      assert.equal(alt, 'joeuser')
      assert.equal(neu, 'userjoe')
    })
    const updateStub = sinon.stub(EntityRepository.prototype, 'updateUser').callsFake((user) => {
      assert.isNotNull(user)
      assert.equal(user.username, 'userjoe')
      return user
    })
    // act
    const tUser = new User('userjoe', 'joeuser@example.com', 'Joe Q. User')
    const renamed = await usecase('joeuser', tUser)
    // assert
    assert.equal(renamed.username, 'userjoe')
    assert.isTrue(getStub.calledOnce)
    assert.isTrue(renameStub.calledOnce)
    assert.isTrue(updateStub.calledOnce)
    getStub.restore()
    renameStub.restore()
    updateStub.restore()
  })
})
