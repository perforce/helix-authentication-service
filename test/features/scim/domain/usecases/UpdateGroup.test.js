//
// Copyright 2023 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { after, before, describe, it } from 'mocha'
import sinon from 'sinon'
import { Group } from 'helix-auth-svc/lib/features/scim/domain/entities/Group.js'
import { MutabilityError } from 'helix-auth-svc/lib/features/scim/domain/errors/MutabilityError.js'
import { NoSuchGroupError } from 'helix-auth-svc/lib/features/scim/domain/errors/NoSuchGroupError.js'
import UpdateGroup from 'helix-auth-svc/lib/features/scim/domain/usecases/UpdateGroup.js'
import { EntityRepository } from 'helix-auth-svc/lib/features/scim/domain/repositories/EntityRepository.js'

describe('UpdateGroup use case', function () {
  describe('single server', function () {
    let usecase

    before(function () {
      const entityRepository = new EntityRepository()
      usecase = UpdateGroup({
        getDomainLeader: () => { return null },
        getDomainMembers: () => [],
        entityRepository: entityRepository
      })
    })

    after(function () {
      sinon.restore()
    })

    it('should raise an error for invalid input', async function () {
      assert.throws(() => UpdateGroup({
        getDomainLeader: null,
        getDomainMembers: () => [],
        entityRepository: {}
      }), AssertionError)
      assert.throws(() => UpdateGroup({
        getDomainLeader: () => { return null },
        getDomainMembers: null,
        entityRepository: {}
      }), AssertionError)
      assert.throws(() => UpdateGroup({
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
        await usecase('groupname', null)
        assert.fail('should have raised error')
      } catch (err) {
        assert.include(err.message, 'group record must be defined')
      }
    })

    it('should reject missing group entity', async function () {
      // arrange
      const getStub = sinon.stub(EntityRepository.prototype, 'getGroup').callsFake((id) => {
        assert.equal(id, 'staff')
        return Promise.resolve(null)
      })
      const updateStub = sinon.stub(EntityRepository.prototype, 'updateGroup').callsFake((group) => {
        assert.isNotNull(group)
        return Promise.resolve(group)
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
      assert.isTrue(updateStub.notCalled)
      getStub.restore()
      updateStub.restore()
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
      const getStub = sinon.stub(EntityRepository.prototype, 'getGroup').callsFake((name) => {
        assert.equal(name, 'staff')
        return Promise.resolve(new Group('staff', []))
      })
      const updateStub = sinon.stub(EntityRepository.prototype, 'updateGroup').callsFake((group) => {
        return Promise.resolve(group)
      })
      // act
      const tGroup = new Group('staff', [
        { value: 'joe', display: 'Joe Plumber' },
        { value: 'susan', display: 'Susan Winters' }
      ])
      const updated = await usecase('staff', tGroup)
      // assert
      assert.propertyVal(updated, 'displayName', 'staff')
      assert.lengthOf(updated.members, 2)
      assert.isTrue(getStub.calledOnce)
      assert.isTrue(updateStub.calledOnce)
      getStub.restore()
      updateStub.restore()
    })
  })

  describe('multiple servers', function () {
    let usecase

    before(function () {
      const entityRepository = new EntityRepository()
      usecase = UpdateGroup({
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

    it('should remove group from all domain members', async function () {
      // arrange
      const getStub = sinon.stub(EntityRepository.prototype, 'getGroup').callsFake((name) => {
        assert.equal(name, 'staff')
        return Promise.resolve(new Group('staff', []))
      })
      const updateStub = sinon.stub(EntityRepository.prototype, 'updateGroup').callsFake((group) => {
        return Promise.resolve(group)
      })
      // act
      const tGroup = new Group('staff', [
        { value: 'joe', display: 'Joe Plumber' },
        { value: 'susan', display: 'Susan Winters' }
      ])
      const updated = await usecase('staff', tGroup)
      // assert
      assert.propertyVal(updated, 'displayName', 'staff')
      assert.lengthOf(updated.members, 2)
      assert.isTrue(getStub.calledOnce)
      sinon.assert.calledWith(
        getStub,
        sinon.match('staff'),
        sinon.match.has('p4port', 'ssl:chicago:1666')
      )
      assert.isTrue(updateStub.calledTwice)
      sinon.assert.calledWith(
        updateStub,
        sinon.match.has('displayName', 'staff'),
        sinon.match.has('p4port', 'ssl:chicago:1666')
      )
      sinon.assert.calledWith(
        updateStub,
        sinon.match.has('displayName', 'staff'),
        sinon.match.has('p4port', 'ssl:tokyo:1666')
      )
      getStub.restore()
      updateStub.restore()
    })
  })
})
