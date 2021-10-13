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
const AddUser = include('lib/features/scim/domain/usecases/AddUser')
const EntityRepository = include('lib/features/scim/domain/repositories/EntityRepository')

describe('AddUser use case', function () {
  let usecase

  before(function () {
    const entityRepository = new EntityRepository()
    usecase = AddUser({ entityRepository: entityRepository })
  })

  after(function () {
    sinon.restore()
  })

  it('should raise an error for invalid input', async function () {
    assert.throws(() => AddUser({ entityRepository: null }), AssertionError)
    try {
      await usecase(null)
      assert.fail('should have raised error')
    } catch (err) {
      assert.instanceOf(err, AssertionError)
    }
  })

  it('should reject overwriting existing user entity', async function () {
    // arrange
    const tUser = new User('joeuser', 'joeuser@example.com', 'Joe Q. User')
    // eslint-disable-next-line no-unused-vars
    const getStub = sinon.stub(EntityRepository.prototype, 'getUser').callsFake((username) => {
      return tUser
    })
    // eslint-disable-next-line no-unused-vars
    const addStub = sinon.stub(EntityRepository.prototype, 'addUser').callsFake((user) => {
      return null
    })
    // act
    try {
      await usecase(tUser)
      assert.fail('should raise error')
    } catch (err) {
      assert.instanceOf(err, Error)
    }
    // assert
    assert.isTrue(getStub.calledOnce)
    assert.isTrue(addStub.notCalled)
    getStub.restore()
    addStub.restore()
  })

  it('should not fail when adding a user entity', async function () {
    // arrange
    // eslint-disable-next-line no-unused-vars
    const getStub = sinon.stub(EntityRepository.prototype, 'getUser').callsFake((username) => {
      return null
    })
    // eslint-disable-next-line no-unused-vars
    const addStub = sinon.stub(EntityRepository.prototype, 'addUser').callsFake((user) => {
      return null
    })
    // act
    const tUser = new User('joeuser', 'joeuser@example.com', 'Joe Q. User')
    await usecase(tUser)
    // assert
    assert.isTrue(getStub.calledOnce)
    assert.isTrue(addStub.calledOnce)
    getStub.restore()
    addStub.restore()
  })
})
