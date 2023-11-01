//
// Copyright 2023 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { after, before, describe, it } from 'mocha'
import sinon from 'sinon'
import RemoveUser from 'helix-auth-svc/lib/features/scim/domain/usecases/RemoveUser.js'
import { EntityRepository } from 'helix-auth-svc/lib/features/scim/domain/repositories/EntityRepository.js'

describe('RemoveUser use case', function () {
  describe('single server', function () {
    let usecase

    before(function () {
      const entityRepository = new EntityRepository()
      usecase = RemoveUser({
        getDomainLeader: () => { return null },
        getDomainMembers: () => [],
        entityRepository: entityRepository
      })
    })

    after(function () {
      sinon.restore()
    })

    it('should raise an error for invalid input', async function () {
      assert.throws(() => RemoveUser({
        getDomainLeader: null,
        getDomainMembers: () => [],
        entityRepository: {}
      }), AssertionError)
      assert.throws(() => RemoveUser({
        getDomainLeader: () => { return null },
        getDomainMembers: null,
        entityRepository: {}
      }), AssertionError)
      assert.throws(() => RemoveUser({
        getDomainLeader: () => { return null },
        getDomainMembers: () => [],
        entityRepository: null
      }), AssertionError)
      try {
        await usecase(null)
        assert.fail('should have raised error')
      } catch (err) {
        assert.include(err.message, 'userId must be defined')
      }
    })

    it('should succeed for a missing user entity', async function () {
      // arrange
      const stub = sinon.stub(EntityRepository.prototype, 'removeUser').callsFake((id) => {
        assert.equal(id, '123456')
        return Promise.resolve()
      })
      // act
      await usecase('123456')
      // assert
      assert.isTrue(stub.calledOnce)
      stub.restore()
    })

    it('should succeed an existing user entity', async function () {
      // arrange
      const stub = sinon.stub(EntityRepository.prototype, 'removeUser').callsFake((id) => {
        assert.equal(id, 'joeuser')
        return Promise.resolve()
      })
      // act
      await usecase('joeuser')
      // assert
      assert.isTrue(stub.calledOnce)
      stub.restore()
    })
  })

  describe('multiple servers', function () {
    let usecase

    before(function () {
      const entityRepository = new EntityRepository()
      usecase = RemoveUser({
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

    it('should remove user from all domain members', async function () {
      // arrange
      const removeStub = sinon.stub(EntityRepository.prototype, 'removeUser').callsFake(() => {
        return Promise.resolve()
      })
      // act
      await usecase('joeuser', 'canine')
      // assert
      assert.isTrue(removeStub.calledTwice)
      sinon.assert.calledWith(
        removeStub,
        sinon.match('joeuser'),
        sinon.match.has('p4port', 'ssl:chicago:1666')
      )
      sinon.assert.calledWith(
        removeStub,
        sinon.match('joeuser'),
        sinon.match.has('p4port', 'ssl:tokyo:1666')
      )
      removeStub.restore()
    })
  })
})
