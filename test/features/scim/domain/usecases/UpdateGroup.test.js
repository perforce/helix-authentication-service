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

const Group = include('lib/features/scim/domain/entities/Group')
const MutabilityError = include('lib/features/scim/domain/errors/MutabilityError')
const NoSuchGroupError = include('lib/features/scim/domain/errors/NoSuchGroupError')
const UpdateGroup = include('lib/features/scim/domain/usecases/UpdateGroup')
const EntityRepository = include('lib/features/scim/domain/repositories/EntityRepository')

describe('UpdateGroup use case', function () {
  let usecase

  before(function () {
    const entityRepository = new EntityRepository()
    usecase = UpdateGroup({ entityRepository: entityRepository })
  })

  after(function () {
    sinon.restore()
  })

  it('should raise an error for invalid input', async function () {
    assert.throws(() => UpdateGroup({ entityRepository: null }), AssertionError)
    try {
      await usecase(null, null)
      assert.fail('should have raised error')
    } catch (err) {
      assert.include(err.message, 'group identifier must be defined')
    }
    try {
      await usecase('groupname', null)
      assert.fail('should have raised error')
    } catch (err) {
      assert.include(err.message, 'group record must be defined')
    }
  })

  it('should reject missing group entity', async function () {
    // arrange
    const getStub = sinon.stub(EntityRepository.prototype, 'getGroup').callsFake((username) => {
      assert.equal(username, 'staff')
      return null
    })
    const addStub = sinon.stub(EntityRepository.prototype, 'updateGroup').callsFake((group) => {
      assert.isNotNull(group)
      return null
    })
    // act
    try {
      const tGroup = new Group('staff', [])
      await usecase('staff', tGroup)
      assert.fail('should raise error')
    } catch (err) {
      assert.instanceOf(err, NoSuchGroupError)
    }
    // assert
    assert.isTrue(getStub.calledOnce)
    assert.isTrue(addStub.notCalled)
    getStub.restore()
    addStub.restore()
  })

  it('should reject attempts to rename a group', async function () {
    // arrange
    const getStub = sinon.stub(EntityRepository.prototype, 'getGroup').callsFake((name) => {
      assert.equal(name, 'staff')
      return new Group('staff', [])
    })
    const updateStub = sinon.stub(EntityRepository.prototype, 'updateGroup').callsFake((group) => {
      return group
    })
    // act
    try {
      await usecase('staff', new Group('newname', []))
      assert.fail('should raise error')
    } catch (err) {
      assert.instanceOf(err, MutabilityError)
    }
    // assert
    assert.isTrue(getStub.calledOnce)
    assert.isTrue(updateStub.notCalled)
    getStub.restore()
    updateStub.restore()
  })

  it('should succeed when updating existing group entity', async function () {
    // arrange
    const tGroup = new Group('staff', [])
    // eslint-disable-next-line no-unused-vars
    const getStub = sinon.stub(EntityRepository.prototype, 'getGroup').callsFake((name) => {
      return name === 'staff' ? tGroup : null
    })
    const addStub = sinon.stub(EntityRepository.prototype, 'updateGroup').callsFake((group) => {
      return group
    })
    // act
    await usecase('staff', tGroup)
    // assert
    assert.isTrue(getStub.calledOnce)
    assert.isTrue(addStub.calledOnce)
    getStub.restore()
    addStub.restore()
  })
})
