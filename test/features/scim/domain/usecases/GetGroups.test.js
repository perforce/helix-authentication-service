//
// Copyright 2023 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { after, before, describe, it } from 'mocha'
import sinon from 'sinon'
import { Query } from 'helix-auth-svc/lib/features/scim/domain/entities/Query.js'
import { Group } from 'helix-auth-svc/lib/features/scim/domain/entities/Group.js'
import GetGroups from 'helix-auth-svc/lib/features/scim/domain/usecases/GetGroups.js'
import { EntityRepository } from 'helix-auth-svc/lib/features/scim/domain/repositories/EntityRepository.js'

describe('GetGroups use case', function () {
  describe('single server', function () {
    let usecase

    before(function () {
      const entityRepository = new EntityRepository()
      usecase = GetGroups({
        getDomainLeader: () => { return null },
        entityRepository
      })
    })

    after(function () {
      sinon.restore()
    })

    it('should raise an error for invalid input', async function () {
      assert.throws(() => GetGroups({ getDomainLeader: {}, entityRepository: null }), AssertionError)
      assert.throws(() => GetGroups({ getDomainLeader: null, entityRepository: {} }), AssertionError)
      try {
        await usecase(null)
        assert.fail('should have raised error')
      } catch (err) {
        assert.include(err.message, 'query must be defined')
      }
    })

    it('should return [] when no groups available', async function () {
      // arrange
      const stub = sinon.stub(EntityRepository.prototype, 'getGroups').callsFake(() => {
        return []
      })
      const query = new Query()
      // act
      const results = await usecase(query)
      // assert
      assert.isEmpty(results)
      assert.isTrue(stub.calledOnce)
      stub.restore()
    })

    it('should return one entry when one group exists', async function () {
      // arrange
      const tGroup = new Group('staff', [])
      const stub = sinon.stub(EntityRepository.prototype, 'getGroups').callsFake(() => {
        return Promise.resolve([tGroup])
      })
      const query = new Query()
      // act
      const results = await usecase(query)
      // assert
      assert.isNotEmpty(results)
      assert.equal(results[0].displayName, 'staff')
      assert.isTrue(stub.calledOnce)
      stub.restore()
    })

    it('should filter results by matching attribute', async function () {
      // arrange
      const tGroup1 = new Group('admins', [])
      const tGroup2 = new Group('staff', [])
      const tGroup3 = new Group('zebras', [])
      const stub = sinon.stub(EntityRepository.prototype, 'getGroups').callsFake(() => {
        return Promise.resolve([tGroup1, tGroup2, tGroup3])
      })
      const query = new Query({
        filter: 'displayName eq "staff"'
      })
      // act
      const results = await usecase(query)
      // assert
      assert.lengthOf(results, 1)
      assert.equal(results[0].displayName, 'staff')
      assert.isTrue(stub.calledOnce)
      stub.restore()
    })

    it('should sort results by specific attribute', async function () {
      // arrange
      const tGroup1 = new Group('admins', [])
      const tGroup2 = new Group('staff', [])
      const tGroup3 = new Group('zebras', [])
      const stub = sinon.stub(EntityRepository.prototype, 'getGroups').callsFake(() => {
        return Promise.resolve([tGroup3, tGroup2, tGroup1])
      })
      const query = new Query({
        sortBy: 'displayName'
      })
      // act
      const results = await usecase(query)
      // assert
      assert.lengthOf(results, 3)
      assert.equal(results[0].displayName, 'admins')
      assert.equal(results[1].displayName, 'staff')
      assert.equal(results[2].displayName, 'zebras')
      assert.isTrue(stub.calledOnce)
      stub.restore()
    })

    it('should reverse sort results by specific attribute', async function () {
      // arrange
      const tGroup1 = new Group('admins', [])
      const tGroup2 = new Group('staff', [])
      const tGroup3 = new Group('zebras', [])
      const stub = sinon.stub(EntityRepository.prototype, 'getGroups').callsFake(() => {
        return Promise.resolve([tGroup3, tGroup2, tGroup1])
      })
      const query = new Query({
        sortBy: 'displayName',
        sortOrder: 'descending'
      })
      // act
      const results = await usecase(query)
      // assert
      assert.lengthOf(results, 3)
      assert.equal(results[0].displayName, 'zebras')
      assert.equal(results[1].displayName, 'staff')
      assert.equal(results[2].displayName, 'admins')
      assert.isTrue(stub.calledOnce)
      stub.restore()
    })
  })

  describe('multiple servers', function () {
    let usecase

    before(function () {
      const entityRepository = new EntityRepository()
      usecase = GetGroups({
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

    it('should get all groups from leading domain', async function () {
      // arrange
      const tGroup = new Group('staff', ['sam', 'frodo'])
      const getStub = sinon.stub(EntityRepository.prototype, 'getGroups').callsFake(() => {
        return Promise.resolve([tGroup])
      })
      const query = new Query()
      // act
      const results = await usecase(query, 'canine')
      // assert
      assert.lengthOf(results, 1)
      assert.equal(results[0].displayName, 'staff')
      assert.isTrue(getStub.calledOnce)
      sinon.assert.calledWith(
        getStub,
        sinon.match.any,
        sinon.match.has('p4port', 'ssl:chicago:1666')
      )
      getStub.restore()
    })
  })
})
