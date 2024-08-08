//
// Copyright 2023 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { after, before, describe, it } from 'mocha'
import sinon from 'sinon'
import { Query } from 'helix-auth-svc/lib/features/scim/domain/entities/Query.js'
import { User } from 'helix-auth-svc/lib/features/scim/domain/entities/User.js'
import GetUsers from 'helix-auth-svc/lib/features/scim/domain/usecases/GetUsers.js'
import { EntityRepository } from 'helix-auth-svc/lib/features/scim/domain/repositories/EntityRepository.js'

describe('GetUsers use case', function () {
  describe('single server', function () {
    let usecase

    before(function () {
      const entityRepository = new EntityRepository()
      usecase = GetUsers({
        getDomainLeader: () => { return null },
        entityRepository
      })
    })

    after(function () {
      sinon.restore()
    })

    it('should raise an error for invalid input', async function () {
      assert.throws(() => GetUsers({ getDomainLeader: {}, entityRepository: null }), AssertionError)
      assert.throws(() => GetUsers({ getDomainLeader: null, entityRepository: {} }), AssertionError)
      try {
        await usecase(null)
        assert.fail('should have raised error')
      } catch (err) {
        assert.include(err.message, 'query must be defined')
      }
    })

    it('should return [] when no users available', async function () {
      // arrange
      const stub = sinon.stub(EntityRepository.prototype, 'getUsers').callsFake(() => {
        return Promise.resolve([])
      })
      const query = new Query()
      // act
      const results = await usecase(query)
      // assert
      assert.isEmpty(results)
      assert.isTrue(stub.calledOnce)
      stub.restore()
    })

    it('should return one entry when one user exists', async function () {
      // arrange
      const tUser = new User('joeuser', 'joeuser@example.com', 'Joe Q. User')
      const stub = sinon.stub(EntityRepository.prototype, 'getUsers').callsFake(() => {
        return Promise.resolve([tUser])
      })
      const query = new Query()
      // act
      const results = await usecase(query)
      // assert
      assert.isNotEmpty(results)
      assert.equal(results[0].username, tUser.username)
      assert.equal(results[0].fullname, 'Joe Q. User')
      assert.isTrue(stub.calledOnce)
      stub.restore()
    })

    it('should filter results by matching attribute', async function () {
      // arrange
      const tUser1 = new User('joeuser', 'joeuser@example.com', 'Joe Q. User')
      const tUser2 = new User('maduser', 'maduser@example.com', 'Mad Max')
      const tUser3 = new User('toeuser', 'toeuser@example.com', 'Toe Cutter')
      const stub = sinon.stub(EntityRepository.prototype, 'getUsers').callsFake(() => {
        return Promise.resolve([tUser1, tUser2, tUser3])
      })
      const query = new Query({
        filter: 'userName eq "joeuser"'
      })
      // act
      const results = await usecase(query)
      // assert
      assert.lengthOf(results, 1)
      assert.equal(results[0].username, tUser1.username)
      assert.equal(results[0].fullname, 'Joe Q. User')
      assert.isTrue(stub.calledOnce)
      stub.restore()
    })

    it('should filter by original userName', async function () {
      // arrange
      const tUser1 = new User('joeuser@example.com', 'joeuser@example.com', 'Joe Q. User')
      const tUser2 = new User('maduser@example.com', 'maduser@example.com', 'Mad Max')
      const tUser3 = new User('toeuser@example.com', 'toeuser@example.com', 'Toe Cutter')
      const stub = sinon.stub(EntityRepository.prototype, 'getUsers').callsFake(() => {
        return Promise.resolve([tUser1, tUser2, tUser3])
      })
      const query = new Query({
        filter: 'userName eq "joeuser@example.com"'
      })
      // act
      const results = await usecase(query)
      // assert
      assert.lengthOf(results, 1)
      assert.equal(results[0].username, tUser1.username)
      assert.equal(results[0].fullname, 'Joe Q. User')
      assert.isTrue(stub.calledOnce)
      stub.restore()
    })

    it('should sort results by specific attribute', async function () {
      // arrange
      const tUser1 = new User('joeuser', 'joeuser@example.com', 'Joe Q. User')
      const tUser2 = new User('maduser', 'maduser@example.com', 'Mad Max')
      const tUser3 = new User('toeuser', 'toeuser@example.com', 'Toe Cutter')
      const stub = sinon.stub(EntityRepository.prototype, 'getUsers').callsFake(() => {
        return Promise.resolve([tUser3, tUser2, tUser1])
      })
      const query = new Query({
        sortBy: 'userName'
      })
      // act
      const results = await usecase(query)
      // assert
      assert.lengthOf(results, 3)
      assert.equal(results[0].username, tUser1.username)
      assert.equal(results[1].username, tUser2.username)
      assert.equal(results[2].username, tUser3.username)
      assert.isTrue(stub.calledOnce)
      stub.restore()
    })

    it('should reverse sort results by specific attribute', async function () {
      // arrange
      const tUser1 = new User('joeuser', 'joeuser@example.com', 'Joe Q. User')
      const tUser2 = new User('maduser', 'maduser@example.com', 'Mad Max')
      const tUser3 = new User('toeuser', 'toeuser@example.com', 'Toe Cutter')
      const stub = sinon.stub(EntityRepository.prototype, 'getUsers').callsFake(() => {
        return Promise.resolve([tUser3, tUser2, tUser1])
      })
      const query = new Query({
        sortBy: 'userName',
        sortOrder: 'descending'
      })
      // act
      const results = await usecase(query)
      // assert
      assert.lengthOf(results, 3)
      assert.equal(results[0].username, tUser3.username)
      assert.equal(results[1].username, tUser2.username)
      assert.equal(results[2].username, tUser1.username)
      assert.isTrue(stub.calledOnce)
      stub.restore()
    })
  })

  describe('multiple servers', function () {
    let usecase

    before(function () {
      const entityRepository = new EntityRepository()
      usecase = GetUsers({
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
      const tUser = new User('joeuser', 'joeuser@example.com', 'Joe Q. User')
      const getStub = sinon.stub(EntityRepository.prototype, 'getUsers').callsFake(() => {
        return Promise.resolve([tUser])
      })
      const query = new Query()
      // act
      const results = await usecase(query, 'canine')
      // assert
      assert.lengthOf(results, 1)
      assert.equal(results[0].username, 'joeuser')
      assert.isTrue(getStub.calledOnce)
      sinon.assert.calledWith(
        getStub,
        sinon.match.any,
        sinon.match.has('p4port', 'ssl:chicago:1666'),
        sinon.match('canine')
      )
      getStub.restore()
    })
  })
})
