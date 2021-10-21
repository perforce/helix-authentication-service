//
// Copyright 2021 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { after, before, describe, it } from 'mocha'
import sinon from 'sinon'
import { Group } from 'helix-auth-svc/lib/features/scim/domain/entities/Group.js'
import AddGroup from 'helix-auth-svc/lib/features/scim/domain/usecases/AddGroup.js'
import { EntityRepository } from 'helix-auth-svc/lib/features/scim/domain/repositories/EntityRepository.js'

describe('AddGroup use case', function () {
  let usecase

  before(function () {
    const entityRepository = new EntityRepository()
    usecase = AddGroup({ entityRepository: entityRepository })
  })

  after(function () {
    sinon.restore()
  })

  it('should raise an error for invalid input', async function () {
    assert.throws(() => AddGroup({ entityRepository: null }), AssertionError)
    try {
      await usecase(null)
      assert.fail('should have raised error')
    } catch (err) {
      assert.instanceOf(err, AssertionError)
    }
    try {
      // missing members property
      await usecase(new Group('staff'))
      assert.fail('should have raised error')
    } catch (err) {
      assert.instanceOf(err, AssertionError)
    }
    try {
      // group member missing value property
      await usecase(new Group('staff', [{ display: 'Joe Plumber' }]))
      assert.fail('should have raised error')
    } catch (err) {
      assert.instanceOf(err, AssertionError)
    }
  })

  it('should reject overwriting existing group entity', async function () {
    // arrange
    const tGroup = new Group('staff', [])
    // eslint-disable-next-line no-unused-vars
    const getStub = sinon.stub(EntityRepository.prototype, 'getGroup').callsFake((username) => {
      return tGroup
    })
    // eslint-disable-next-line no-unused-vars
    const addStub = sinon.stub(EntityRepository.prototype, 'addGroup').callsFake((user) => {
      return null
    })
    // act
    try {
      await usecase(tGroup)
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

  it('should not fail when adding a group entity', async function () {
    // arrange
    // eslint-disable-next-line no-unused-vars
    const getStub = sinon.stub(EntityRepository.prototype, 'getGroup').callsFake((username) => {
      return null
    })
    // eslint-disable-next-line no-unused-vars
    const addStub = sinon.stub(EntityRepository.prototype, 'addGroup').callsFake((user) => {
      return null
    })
    // act
    const tUser = new Group('staff', [])
    await usecase(tUser)
    // assert
    assert.isTrue(getStub.calledOnce)
    assert.isTrue(addStub.calledOnce)
    getStub.restore()
    addStub.restore()
  })

  it('should not fail for group with members', async function () {
    // arrange
    // eslint-disable-next-line no-unused-vars
    const getStub = sinon.stub(EntityRepository.prototype, 'getGroup').callsFake((username) => {
      return null
    })
    // eslint-disable-next-line no-unused-vars
    const addStub = sinon.stub(EntityRepository.prototype, 'addGroup').callsFake((user) => {
      return null
    })
    // act
    const tUser = new Group('staff', [
      { value: 'joe', display: 'Joe Plumber' },
      { value: 'susan', display: 'Susan Winters' }
    ])
    await usecase(tUser)
    // assert
    assert.isTrue(getStub.calledOnce)
    assert.isTrue(addStub.calledOnce)
    getStub.restore()
    addStub.restore()
  })
})
