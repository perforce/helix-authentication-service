//
// Copyright 2023 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { after, before, describe, it } from 'mocha'
import sinon from 'sinon'
import { User } from 'helix-auth-svc/lib/features/scim/domain/entities/User.js'
import GetUser from 'helix-auth-svc/lib/features/scim/domain/usecases/GetUser.js'
import { EntityRepository } from 'helix-auth-svc/lib/features/scim/domain/repositories/EntityRepository.js'

describe('GetUser use case', function () {
  describe('single server', function () {
    let usecase

    before(function () {
      const entityRepository = new EntityRepository()
      usecase = GetUser({
        getDomainLeader: () => { return null },
        entityRepository: entityRepository
      })
    })

    after(function () {
      sinon.restore()
    })

    it('should raise an error for invalid input', async function () {
      assert.throws(() => GetUser({ getDomainLeader: {}, entityRepository: null }), AssertionError)
      assert.throws(() => GetUser({ getDomainLeader: null, entityRepository: {} }), AssertionError)
      try {
        await usecase(null)
        assert.fail('should have raised error')
      } catch (err) {
        assert.include(err.message, 'user identifier must be defined')
      }
    })

    it('should return null for a missing user entity', async function () {
      // arrange
      const stub = sinon.stub(EntityRepository.prototype, 'getUser').callsFake(() => {
        return Promise.resolve(null)
      })
      // act
      const user = await usecase('123456')
      // assert
      assert.isNull(user)
      assert.isTrue(stub.calledOnce)
      stub.restore()
    })

    it('should find an existing user entity', async function () {
      // arrange
      const tUser = new User('joeuser', 'joeuser@example.com', 'Joe Q. User')
      const stub = sinon.stub(EntityRepository.prototype, 'getUser').callsFake(() => {
        return Promise.resolve(tUser)
      })
      // act
      const user = await usecase(tUser.username)
      // assert
      assert.isNotNull(user.username)
      assert.equal(user.username, tUser.username)
      assert.equal(user.fullname, 'Joe Q. User')
      assert.isTrue(stub.calledOnce)
      stub.restore()
    })
  })

  describe('multiple servers', function () {
    let usecase

    before(function () {
      const entityRepository = new EntityRepository()
      usecase = GetUser({
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

    it('should find existing user in leading domain', async function () {
      // arrange
      const tUser = new User('joeuser', 'joeuser@example.com', 'Joe Q. User')
      const getStub = sinon.stub(EntityRepository.prototype, 'getUser').callsFake(() => {
        return Promise.resolve(tUser)
      })
      // act
      const user = await usecase(tUser.username, 'canine')
      // assert
      assert.isNotNull(user.username)
      assert.equal(user.username, tUser.username)
      assert.equal(user.fullname, 'Joe Q. User')
      assert.isTrue(getStub.calledOnce)
      sinon.assert.calledWith(
        getStub,
        sinon.match('joeuser'),
        sinon.match.has('p4port', 'ssl:chicago:1666')
      )
      getStub.restore()
    })
  })
})
