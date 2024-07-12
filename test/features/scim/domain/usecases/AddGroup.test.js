//
// Copyright 2023 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { after, before, describe, it } from 'mocha'
import sinon from 'sinon'
import { Group } from 'helix-auth-svc/lib/features/scim/domain/entities/Group.js'
import AddGroup from 'helix-auth-svc/lib/features/scim/domain/usecases/AddGroup.js'
import { EntityRepository } from 'helix-auth-svc/lib/features/scim/domain/repositories/EntityRepository.js'

describe('AddGroup use case', function () {
  describe('single server', function () {
    let usecase

    before(function () {
      const entityRepository = new EntityRepository()
      usecase = AddGroup({
        getDomainLeader: () => { return null },
        getDomainMembers: () => [],
        entityRepository: entityRepository
      })
    })

    after(function () {
      sinon.restore()
    })

    it('should raise an error for invalid input', async function () {
      assert.throws(() => AddGroup({
        getDomainLeader: null,
        getDomainMembers: () => [],
        entityRepository: {}
      }), AssertionError)
      assert.throws(() => AddGroup({
        getDomainLeader: () => { return null },
        getDomainMembers: null,
        entityRepository: {}
      }), AssertionError)
      assert.throws(() => AddGroup({
        getDomainLeader: () => { return null },
        getDomainMembers: () => [],
        entityRepository: null
      }), AssertionError)
      try {
        await usecase(null)
        assert.fail('should have raised error')
      } catch (err) {
        assert.include(err.message, 'group record must be defined')
      }
      try {
        // missing members property
        const group = new Group('staff', [])
        delete group.members
        await usecase(group)
        assert.fail('should have raised error')
      } catch (err) {
        assert.include(err.message, 'group must have members property')
      }
      try {
        // group member missing value property
        await usecase(new Group('staff', [{ display: 'Joe Plumber' }]))
        assert.fail('should have raised error')
      } catch (err) {
        assert.equal(err.message, 'group member must have `value` property')
      }
    })

    it('should reject overwriting existing group entity', async function () {
      // arrange
      const tGroup = new Group('staff', [])
      // eslint-disable-next-line no-unused-vars
      const getStub = sinon.stub(EntityRepository.prototype, 'getGroup').callsFake((displayName) => {
        return Promise.resolve(tGroup)
      })
      // eslint-disable-next-line no-unused-vars
      const addStub = sinon.stub(EntityRepository.prototype, 'addGroup').callsFake((group) => {
        return Promise.resolve(null)
      })
      // act
      try {
        await usecase(tGroup)
        assert.fail('should raise error')
      } catch (err) {
        assert.equal(err.message, 'group already exists')
      }
      // assert
      assert.isTrue(getStub.calledOnce)
      assert.isTrue(addStub.notCalled)
      getStub.restore()
      addStub.restore()
    })

    it('should succeed when adding an empty group', async function () {
      // arrange
      // eslint-disable-next-line no-unused-vars
      const getStub = sinon.stub(EntityRepository.prototype, 'getGroup').callsFake((displayName) => {
        return Promise.resolve(null)
      })
       
      const addStub = sinon.stub(EntityRepository.prototype, 'addGroup').callsFake((group) => {
        return Promise.resolve(group)
      })
      // act
      const tGroup = new Group('staff', [])
      const added = await usecase(tGroup)
      // assert
      assert.property(added, 'displayName')
      assert.isTrue(getStub.calledOnce)
      assert.isTrue(addStub.calledOnce)
      getStub.restore()
      addStub.restore()
    })

    it('should succeed when adding a group with members', async function () {
      // arrange
      // eslint-disable-next-line no-unused-vars
      const getStub = sinon.stub(EntityRepository.prototype, 'getGroup').callsFake((displayName) => {
        return Promise.resolve(null)
      })
       
      const addStub = sinon.stub(EntityRepository.prototype, 'addGroup').callsFake((group) => {
        return Promise.resolve(group)
      })
      // act
      const tGroup = new Group('staff', [
        { value: 'joe', display: 'Joe Plumber' },
        { value: 'susan', display: 'Susan Winters' }
      ])
      const added = await usecase(tGroup)
      // assert
      assert.property(added, 'displayName')
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
      usecase = AddGroup({
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
      // eslint-disable-next-line no-unused-vars
      const getStub = sinon.stub(EntityRepository.prototype, 'getGroup').callsFake((displayName, server) => {
        return Promise.resolve(null)
      })
      // eslint-disable-next-line no-unused-vars
      const addStub = sinon.stub(EntityRepository.prototype, 'addGroup').callsFake((group, server) => {
        return Promise.resolve(group)
      })
      // act
      const tGroup = new Group('staff', [])
      const added = await usecase(tGroup, 'canine')
      // assert
      assert.property(added, 'displayName')
      assert.isTrue(getStub.calledOnce)
      sinon.assert.calledWith(
        getStub,
        sinon.match('staff'),
        sinon.match.has('p4port', 'ssl:chicago:1666'),
        sinon.match('canine')
      )
      assert.isTrue(addStub.calledTwice)
      sinon.assert.calledWith(
        addStub,
        sinon.match.has('displayName', 'staff'),
        sinon.match.has('p4port', 'ssl:chicago:1666'),
        sinon.match('canine')
      )
      sinon.assert.calledWith(
        addStub,
        sinon.match.has('displayName', 'staff'),
        sinon.match.has('p4port', 'ssl:tokyo:1666'),
        sinon.match('canine')
      )
      getStub.restore()
      addStub.restore()
    })
  })
})
