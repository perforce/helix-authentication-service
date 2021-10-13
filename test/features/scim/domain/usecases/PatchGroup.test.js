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
const PatchGroup = include('lib/features/scim/domain/usecases/PatchGroup')
const EntityRepository = include('lib/features/scim/domain/repositories/EntityRepository')

describe('PatchGroup use case', function () {
  let usecase

  before(function () {
    const entityRepository = new EntityRepository()
    usecase = PatchGroup({ entityRepository: entityRepository })
  })

  after(function () {
    sinon.restore()
  })

  it('should raise an error for invalid input', async function () {
    assert.throws(() => PatchGroup({ entityRepository: null }), AssertionError)
    try {
      await usecase(null, null)
      assert.fail('should have raised error')
    } catch (err) {
      assert.include(err.message, 'group identifier must be defined')
    }
    try {
      await usecase('username', null)
      assert.fail('should have raised error')
    } catch (err) {
      assert.include(err.message, 'patch must be defined')
    }
  })

  it('should reject missing group entity', async function () {
    // arrange
    const getStub = sinon.stub(EntityRepository.prototype, 'getGroup').callsFake((name) => {
      assert.equal(name, 'staff')
      return null
    })
    const addStub = sinon.stub(EntityRepository.prototype, 'updateGroup').callsFake((group) => {
      assert.isNotNull(group)
      return null
    })
    // act
    const patch = {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
      Operations: [{
        name: 'addMember',
        op: 'add',
        path: 'members',
        value: [{ displayName: 'Joe Plumber', value: 'joeuser' }]
      }]
    }
    try {
      await usecase('staff', patch)
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
    const patch = {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
      Operations: [{
        op: 'replace',
        path: 'displayName',
        value: 'SomeOtherName'
      }]
    }
    try {
      await usecase('staff', patch)
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

  it('should successfully add members to empty group', async function () {
    // arrange
    // eslint-disable-next-line no-unused-vars
    const getStub = sinon.stub(EntityRepository.prototype, 'getGroup').callsFake((name) => {
      return new Group('staff', [])
    })
    const addStub = sinon.stub(EntityRepository.prototype, 'updateGroup').callsFake((group) => {
      return group
    })
    // act
    const patch = {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
      Operations: [{
        name: 'addMember',
        op: 'add',
        path: 'members',
        value: [{ displayName: 'Joe Plumber', value: 'joeuser' }]
      }]
    }
    const updated = await usecase('staff', patch)
    // assert
    assert.equal(updated.displayName, 'staff')
    assert.lengthOf(updated.members, 1)
    assert.isOk(updated.members.find((e) => e.value === 'joeuser'))
    assert.isTrue(getStub.calledOnce)
    assert.isTrue(addStub.calledOnce)
    getStub.restore()
    addStub.restore()
  })

  it('should successfully add members to non-empty group', async function () {
    // arrange
    // eslint-disable-next-line no-unused-vars
    const getStub = sinon.stub(EntityRepository.prototype, 'getGroup').callsFake((name) => {
      return new Group('staff', [{ value: 'susan', display: 'Susan Winters' }])
    })
    const addStub = sinon.stub(EntityRepository.prototype, 'updateGroup').callsFake((group) => {
      return group
    })
    // act
    const patch = {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
      Operations: [{
        name: 'addMember',
        op: 'add',
        path: 'members',
        value: [{ displayName: 'Joe Plumber', value: 'joe' }]
      }]
    }
    const updated = await usecase('staff', patch)
    // assert
    assert.equal(updated.displayName, 'staff')
    assert.lengthOf(updated.members, 2)
    assert.isOk(updated.members.find((e) => e.value === 'joe'))
    assert.isOk(updated.members.find((e) => e.value === 'susan'))
    assert.isTrue(getStub.calledOnce)
    assert.isTrue(addStub.calledOnce)
    getStub.restore()
    addStub.restore()
  })

  it('should ignore no-op changes to group members', async function () {
    // arrange
    const getStub = sinon.stub(EntityRepository.prototype, 'getGroup').callsFake((name) => {
      assert.equal(name, 'staff')
      return new Group('staff', [{ value: 'susan', display: 'Susan Winters' }])
    })
    const addStub = sinon.stub(EntityRepository.prototype, 'updateGroup').callsFake((group) => {
      assert.isNotNull(group)
      return group
    })
    // act
    const patch = {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
      Operations: [{
        op: 'add',
        path: 'members',
        value: [{ value: 'susan' }]
      }]
    }
    const updated = await usecase('staff', patch)
    // assert
    assert.equal(updated.displayName, 'staff')
    assert.lengthOf(updated.members, 1)
    assert.isOk(updated.members[0].value === 'susan')
    assert.isTrue(getStub.calledOnce)
    assert.isTrue(addStub.notCalled)
    getStub.restore()
    addStub.restore()
  })

  it('should remove group members (already empty group)', async function () {
    // arrange
    // eslint-disable-next-line no-unused-vars
    const getStub = sinon.stub(EntityRepository.prototype, 'getGroup').callsFake((name) => {
      return new Group('staff', [])
    })
    // eslint-disable-next-line no-unused-vars
    const addStub = sinon.stub(EntityRepository.prototype, 'updateGroup').callsFake((group) => {
      return null
    })
    // act
    const patch = {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
      Operations: [{
        op: 'remove',
        path: 'members[value eq "joe"]'
      }]
    }
    const updated = await usecase('staff', patch)
    // assert
    assert.equal(updated.displayName, 'staff')
    assert.lengthOf(updated.members, 0)
    assert.isTrue(getStub.calledOnce)
    assert.isTrue(addStub.notCalled)
    getStub.restore()
    addStub.restore()
  })

  it('should remove group members (nearly empty group)', async function () {
    // arrange
    // eslint-disable-next-line no-unused-vars
    const getStub = sinon.stub(EntityRepository.prototype, 'getGroup').callsFake((name) => {
      return new Group('staff', [{ value: 'joe', display: 'Joe Plumber' }])
    })
    const addStub = sinon.stub(EntityRepository.prototype, 'updateGroup').callsFake((group) => {
      return group
    })
    // act
    const patch = {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
      Operations: [{
        op: 'remove',
        path: 'members[value eq "joe"]'
      }]
    }
    const updated = await usecase('staff', patch)
    // assert
    assert.equal(updated.displayName, 'staff')
    assert.lengthOf(updated.members, 0)
    assert.isTrue(getStub.calledOnce)
    assert.isTrue(addStub.calledOnce)
    getStub.restore()
    addStub.restore()
  })

  it('should remove group members (filled group)', async function () {
    // arrange
    // eslint-disable-next-line no-unused-vars
    const getStub = sinon.stub(EntityRepository.prototype, 'getGroup').callsFake((name) => {
      return new Group('staff', [
        { value: 'joe', display: 'Joe Plumber' },
        { value: 'mike', display: 'Michael London' },
        { value: 'susan', display: 'Susan Winters' }
      ])
    })
    const addStub = sinon.stub(EntityRepository.prototype, 'updateGroup').callsFake((group) => {
      return group
    })
    // act
    const patch = {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
      Operations: [{
        op: 'remove',
        path: 'members[value eq "mike"]'
      }]
    }
    const updated = await usecase('staff', patch)
    // assert
    assert.equal(updated.displayName, 'staff')
    assert.lengthOf(updated.members, 2)
    assert.isOk(updated.members.find((e) => e.value === 'joe'))
    assert.isOk(updated.members.find((e) => e.value === 'susan'))
    assert.isTrue(getStub.calledOnce)
    assert.isTrue(addStub.calledOnce)
    getStub.restore()
    addStub.restore()
  })
})
