//
// Copyright 2023 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { after, before, describe, it } from 'mocha'
import sinon from 'sinon'
import { User } from 'helix-auth-svc/lib/features/scim/domain/entities/User.js'
import AddUser from 'helix-auth-svc/lib/features/scim/domain/usecases/AddUser.js'
import { EntityRepository } from 'helix-auth-svc/lib/features/scim/domain/repositories/EntityRepository.js'

describe('AddUser use case', function () {
  describe('single server', function () {
    let usecase

    before(function () {
      const entityRepository = new EntityRepository()
      usecase = AddUser({
        getDomainLeader: () => { return null },
        getDomainMembers: () => [],
        entityRepository: entityRepository
      })
    })

    after(function () {
      sinon.restore()
    })

    it('should raise an error for invalid input', async function () {
      assert.throws(() => AddUser({
        getDomainLeader: null,
        getDomainMembers: () => [],
        entityRepository: {}
      }), AssertionError)
      assert.throws(() => AddUser({
        getDomainLeader: () => { return null },
        getDomainMembers: null,
        entityRepository: {}
      }), AssertionError)
      assert.throws(() => AddUser({
        getDomainLeader: () => { return null },
        getDomainMembers: () => [],
        entityRepository: null
      }), AssertionError)
      try {
        await usecase(null)
        assert.fail('should have raised error')
      } catch (err) {
        assert.include(err.message, 'user record must be defined')
      }
    })

    it('should reject overwriting existing user entity', async function () {
      // arrange
      const tUser = new User('joeuser', 'joeuser@example.com', 'Joe Q. User')
      // eslint-disable-next-line no-unused-vars
      const getStub = sinon.stub(EntityRepository.prototype, 'getUser').callsFake((username) => {
        return Promise.resolve(tUser)
      })
      // eslint-disable-next-line no-unused-vars
      const addStub = sinon.stub(EntityRepository.prototype, 'addUser').callsFake((user) => {
        return Promise.resolve(null)
      })
      // act
      try {
        await usecase(tUser)
        assert.fail('should raise error')
      } catch (err) {
        assert.equal(err.message, 'user already exists')
      }
      // assert
      assert.isTrue(getStub.calledOnce)
      assert.isTrue(addStub.notCalled)
      getStub.restore()
      addStub.restore()
    })

    it('should not fail when adding a user entity', async function () {
      // arrange
      // eslint-disable-next-line no-unused-vars
      const getStub = sinon.stub(EntityRepository.prototype, 'getUser').callsFake((username) => {
        return Promise.resolve(null)
      })
       
      const addStub = sinon.stub(EntityRepository.prototype, 'addUser').callsFake((user) => {
        return Promise.resolve(user)
      })
      // act
      const tUser = new User('joeuser', 'joeuser@example.com', 'Joe Q. User')
      const added = await usecase(tUser)
      // assert
      assert.property(added, 'username')
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
      usecase = AddUser({
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

    it('should add new user to all domain members', async function () {
      // arrange
      // eslint-disable-next-line no-unused-vars
      const getStub = sinon.stub(EntityRepository.prototype, 'getUser').callsFake((username) => {
        return Promise.resolve(null)
      })
       
      const addStub = sinon.stub(EntityRepository.prototype, 'addUser').callsFake((user) => {
        return Promise.resolve(user)
      })
      // act
      const tUser = new User('joeuser', 'joeuser@example.com', 'Joe Q. User')
      const added = await usecase(tUser, 'canine')
      // assert
      assert.property(added, 'username')
      assert.isTrue(getStub.calledOnce)
      sinon.assert.calledWith(
        getStub,
        sinon.match('joeuser'),
        sinon.match.has('p4port', 'ssl:chicago:1666')
      )
      assert.isTrue(addStub.calledTwice)
      sinon.assert.calledWith(
        addStub,
        sinon.match.has('username', 'joeuser'),
        sinon.match.has('p4port', 'ssl:chicago:1666'),
        sinon.match('canine')
      )
      sinon.assert.calledWith(
        addStub,
        sinon.match.has('username', 'joeuser'),
        sinon.match.has('p4port', 'ssl:tokyo:1666'),
        sinon.match('canine')
      )
      getStub.restore()
      addStub.restore()
    })
  })
})
