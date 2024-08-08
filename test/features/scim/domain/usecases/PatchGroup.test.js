//
// Copyright 2021 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { after, before, describe, it } from 'mocha'
import sinon from 'sinon'
import { Group } from 'helix-auth-svc/lib/features/scim/domain/entities/Group.js'
import { MutabilityError } from 'helix-auth-svc/lib/features/scim/domain/errors/MutabilityError.js'
import { NoSuchGroupError } from 'helix-auth-svc/lib/features/scim/domain/errors/NoSuchGroupError.js'
import PatchGroup from 'helix-auth-svc/lib/features/scim/domain/usecases/PatchGroup.js'
import { EntityRepository } from 'helix-auth-svc/lib/features/scim/domain/repositories/EntityRepository.js'

describe('PatchGroup use case', function () {
  describe('single server', function () {
    let usecase

    before(function () {
      const entityRepository = new EntityRepository()
      usecase = PatchGroup({
        getDomainLeader: () => { return null },
        getDomainMembers: () => [],
        entityRepository: entityRepository
      })
    })

    after(function () {
      sinon.restore()
    })

    it('should raise an error for invalid input', async function () {
      assert.throws(() => PatchGroup({
        getDomainLeader: null,
        getDomainMembers: () => [],
        entityRepository: {}
      }), AssertionError)
      assert.throws(() => PatchGroup({
        getDomainLeader: () => { return null },
        getDomainMembers: null,
        entityRepository: {}
      }), AssertionError)
      assert.throws(() => PatchGroup({
        getDomainLeader: () => { return null },
        getDomainMembers: () => [],
        entityRepository: null
      }), AssertionError)
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
        return Promise.resolve(null)
      })
      const addStub = sinon.stub(EntityRepository.prototype, 'updateGroup').callsFake((group) => {
        assert.isNotNull(group)
        return Promise.resolve(null)
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
        return Promise.resolve(new Group('staff', []))
      })
      const updateStub = sinon.stub(EntityRepository.prototype, 'updateGroup').callsFake((group) => {
        return Promise.resolve(group)
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
        return Promise.resolve(new Group('staff', []))
      })
      const addStub = sinon.stub(EntityRepository.prototype, 'updateGroup').callsFake((group) => {
        return Promise.resolve(group)
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
        return Promise.resolve(new Group('staff', [{ value: 'susan', display: 'Susan Winters' }]))
      })
      const addStub = sinon.stub(EntityRepository.prototype, 'updateGroup').callsFake((group) => {
        return Promise.resolve(group)
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
        return Promise.resolve(new Group('staff', [{ value: 'susan', display: 'Susan Winters' }]))
      })
      const addStub = sinon.stub(EntityRepository.prototype, 'updateGroup').callsFake((group) => {
        assert.isNotNull(group)
        return Promise.resolve(group)
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
      const getStub = sinon.stub(EntityRepository.prototype, 'getGroup').callsFake(() => {
        return Promise.resolve(new Group('staff', []))
      })
      const addStub = sinon.stub(EntityRepository.prototype, 'updateGroup').callsFake(() => {
        return Promise.resolve(null)
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
      const getStub = sinon.stub(EntityRepository.prototype, 'getGroup').callsFake(() => {
        return Promise.resolve(new Group('staff', [{ value: 'joe', display: 'Joe Plumber' }]))
      })
      const addStub = sinon.stub(EntityRepository.prototype, 'updateGroup').callsFake((group) => {
        return Promise.resolve(group)
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
      const getStub = sinon.stub(EntityRepository.prototype, 'getGroup').callsFake(() => {
        return Promise.resolve(new Group('staff', [
          { value: 'joe', display: 'Joe Plumber' },
          { value: 'mike', display: 'Michael London' },
          { value: 'susan', display: 'Susan Winters' }
        ]))
      })
      const addStub = sinon.stub(EntityRepository.prototype, 'updateGroup').callsFake((group) => {
        return Promise.resolve(group)
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

    it('should successfully assign externalId', async function () {
      // arrange
      const getStub = sinon.stub(EntityRepository.prototype, 'getGroup').callsFake(() => {
        return Promise.resolve(new Group('staff', []))
      })
      const addStub = sinon.stub(EntityRepository.prototype, 'updateGroup').callsFake((group) => {
        return Promise.resolve(group)
      })
      // act
      const patch = {
        schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
        Operations: [
          { op: 'add', path: 'externalId', value: 'Staff-All' }
        ]
      }
      const updated = await usecase('staff', patch)
      // assert
      assert.equal(updated.displayName, 'staff')
      assert.equal(updated.externalId, 'Staff-All')
      assert.isTrue(getStub.calledOnce)
      assert.isTrue(addStub.calledOnce)
      getStub.restore()
      addStub.restore()
    })
  })

  describe('multiple servers', function () {
    let usecase

    before(function () {
      const entityRepository = new EntityRepository()
      usecase = PatchGroup({
        getDomainLeader: () => {
          return {
            p4port: 'ssl:chicago:1666',
            p4user: 'super',
            p4passwd: 'secret123',
            domains: ['canine'],
            leader: ['canine']
          }
        },
        getDomainMembers: () => [
          {
            p4port: 'ssl:tokyo:1666',
            p4user: 'super',
            p4passwd: 'secret123',
            domains: ['canine']
          }
        ],
        entityRepository: entityRepository
      })
    })

    after(function () {
      sinon.restore()
    })

    it('should add new group to all domain members', async function () {
      // arrange
      const getStub = sinon.stub(EntityRepository.prototype, 'getGroup').callsFake(() => {
        return Promise.resolve(new Group('staff', [
          { value: 'joe', display: 'Joe Plumber' },
          { value: 'mike', display: 'Michael London' },
          { value: 'susan', display: 'Susan Winters' }
        ]))
      })
      const updateStub = sinon.stub(EntityRepository.prototype, 'updateGroup').callsFake((group) => {
        return Promise.resolve(group)
      })
      // act
      const patch = {
        schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
        Operations: [{
          op: 'remove',
          path: 'members[value eq "mike"]'
        }]
      }
      const updated = await usecase('staff', patch, 'canine')
      // assert
      assert.equal(updated.displayName, 'staff')
      assert.lengthOf(updated.members, 2)
      assert.isOk(updated.members.find((e) => e.value === 'joe'))
      assert.isOk(updated.members.find((e) => e.value === 'susan'))
      assert.isTrue(getStub.calledOnce)
      sinon.assert.calledWith(
        getStub,
        sinon.match('staff'),
        sinon.match.has('p4port', 'ssl:chicago:1666'),
        sinon.match('canine')
      )
      assert.isTrue(updateStub.calledTwice)
      sinon.assert.calledWith(
        updateStub,
        sinon.match.has('displayName', 'staff'),
        sinon.match.has('p4port', 'ssl:chicago:1666'),
        sinon.match('canine')
      )
      sinon.assert.calledWith(
        updateStub,
        sinon.match.has('displayName', 'staff'),
        sinon.match.has('p4port', 'ssl:tokyo:1666'),
        sinon.match('canine')
      )
      getStub.restore()
      updateStub.restore()
    })
  })
})
