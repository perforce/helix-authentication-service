//
// Copyright 2023 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { after, before, describe, it } from 'mocha'
import sinon from 'sinon'
import RemoveGroup from 'helix-auth-svc/lib/features/scim/domain/usecases/RemoveGroup.js'
import { EntityRepository } from 'helix-auth-svc/lib/features/scim/domain/repositories/EntityRepository.js'

describe('RemoveGroup use case', function () {
  describe('single server', function () {
    let usecase

    before(function () {
      const entityRepository = new EntityRepository()
      usecase = RemoveGroup({ 
        getDomainLeader: () => { return null },
        getDomainMembers: () => [],
        entityRepository: entityRepository
      })
    })

    after(function () {
      sinon.restore()
    })

    it('should raise an error for invalid input', async function () {
      assert.throws(() => RemoveGroup({
        getDomainLeader: null,
        getDomainMembers: () => [],
        entityRepository: {}
      }), AssertionError)
      assert.throws(() => RemoveGroup({
        getDomainLeader: () => { return null },
        getDomainMembers: null,
        entityRepository: {}
      }), AssertionError)
      assert.throws(() => RemoveGroup({
        getDomainLeader: () => { return null },
        getDomainMembers: () => [],
        entityRepository: null
      }), AssertionError)
      try {
        await usecase(null)
        assert.fail('should have raised error')
      } catch (err) {
        assert.include(err.message, 'displayName must be defined')
      }
    })

    it('should succeed for a missing group entity', async function () {
      // arrange
      const stub = sinon.stub(EntityRepository.prototype, 'removeGroup').callsFake((id) => {
        assert.equal(id, 'staff')
        return Promise.resolve(null)
      })
      // act
      await usecase('staff')
      // assert
      assert.isTrue(stub.calledOnce)
      stub.restore()
    })

    it('should succeed an existing group entity', async function () {
      // arrange
      const stub = sinon.stub(EntityRepository.prototype, 'removeGroup').callsFake((id) => {
        assert.equal(id, 'staff')
        return Promise.resolve(null)
      })
      // act
      await usecase('staff')
      // assert
      assert.isTrue(stub.calledOnce)
      stub.restore()
    })
  })

  describe('multiple servers', function () {
    let usecase

    before(function () {
      const entityRepository = new EntityRepository()
      usecase = RemoveGroup({
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
      const removeStub = sinon.stub(EntityRepository.prototype, 'removeGroup').callsFake(() => {
        return Promise.resolve()
      })
      // act
      await usecase('staff', 'canine')
      // assert
      assert.isTrue(removeStub.calledTwice)
      sinon.assert.calledWith(
        removeStub,
        sinon.match('staff'),
        sinon.match.has('p4port', 'ssl:chicago:1666')
      )
      sinon.assert.calledWith(
        removeStub,
        sinon.match('staff'),
        sinon.match.has('p4port', 'ssl:tokyo:1666')
      )
      removeStub.restore()
    })
  })
})
