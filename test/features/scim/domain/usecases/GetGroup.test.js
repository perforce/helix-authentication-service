//
// Copyright 2023 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { after, before, describe, it } from 'mocha'
import sinon from 'sinon'
import { Group } from 'helix-auth-svc/lib/features/scim/domain/entities/Group.js'
import GetGroup from 'helix-auth-svc/lib/features/scim/domain/usecases/GetGroup.js'
import { EntityRepository } from 'helix-auth-svc/lib/features/scim/domain/repositories/EntityRepository.js'

describe('GetGroup use case', function () {
  describe('single server', function () {
    let usecase

    before(function () {
      const entityRepository = new EntityRepository()
      usecase = GetGroup({
        getDomainLeader: () => { return null },
        entityRepository: entityRepository
      })
    })

    after(function () {
      sinon.restore()
    })

    it('should raise an error for invalid input', async function () {
      assert.throws(() => GetGroup({ getDomainLeader: {}, entityRepository: null }), AssertionError)
      assert.throws(() => GetGroup({ getDomainLeader: null, entityRepository: {} }), AssertionError)
      try {
        await usecase(null)
        assert.fail('should have raised error')
      } catch (err) {
        assert.include(err.message, 'display name must be defined')
      }
    })

    it('should return null for a missing group entity', async function () {
      // arrange
      // eslint-disable-next-line no-unused-vars
      const stub = sinon.stub(EntityRepository.prototype, 'getGroup').callsFake((id) => {
        return Promise.resolve(null)
      })
      // act
      const group = await usecase('staff')
      // assert
      assert.isNull(group)
      assert.isTrue(stub.calledOnce)
      stub.restore()
    })

    it('should find an existing group entity', async function () {
      // arrange
      const tGroup = new Group('staff', ['sam', 'frodo'])
      // eslint-disable-next-line no-unused-vars
      const stub = sinon.stub(EntityRepository.prototype, 'getGroup').callsFake((id) => {
        return Promise.resolve(tGroup)
      })
      // act
      const group = await usecase('staff')
      // assert
      assert.equal(group.displayName, 'staff')
      assert.lengthOf(group.members, 2)
      assert.isOk(group.members.find((e) => e === 'sam'))
      assert.isOk(group.members.find((e) => e === 'frodo'))
      assert.isTrue(stub.calledOnce)
      stub.restore()
    })
  })

  describe('multiple servers', function () {
    let usecase

    before(function () {
      const entityRepository = new EntityRepository()
      usecase = GetGroup({
        getDomainLeader: () => {
          return {
            p4port: 'ssl:chicago:1666',
            p4user: 'super',
            p4passwd: 'secret123',
            domains: ['canine'],
            leader: ['canine']
          }
        },
        entityRepository: entityRepository
      })
    })

    after(function () {
      sinon.restore()
    })

    it('should find existing group in leading domain', async function () {
      // arrange
      const tGroup = new Group('staff', ['sam', 'frodo'])
      // eslint-disable-next-line no-unused-vars
      const getStub = sinon.stub(EntityRepository.prototype, 'getGroup').callsFake((displayName, server) => {
        return Promise.resolve(tGroup)
      })
      // act
      const group = await usecase('staff', 'canine')
      // assert
      assert.equal(group.displayName, 'staff')
      assert.isTrue(getStub.calledOnce)
      sinon.assert.calledWith(
        getStub,
        sinon.match('staff'),
        sinon.match.has('p4port', 'ssl:chicago:1666'),
        sinon.match('canine')
      )
      getStub.restore()
    })
  })
})
