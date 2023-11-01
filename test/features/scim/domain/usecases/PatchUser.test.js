//
// Copyright 2023 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { after, before, describe, it } from 'mocha'
import sinon from 'sinon'
import { User } from 'helix-auth-svc/lib/features/scim/domain/entities/User.js'
import { NoSuchUserError } from 'helix-auth-svc/lib/features/scim/domain/errors/NoSuchUserError.js'
import PatchUser from 'helix-auth-svc/lib/features/scim/domain/usecases/PatchUser.js'
import { EntityRepository } from 'helix-auth-svc/lib/features/scim/domain/repositories/EntityRepository.js'

describe('PatchUser use case', function () {
  describe('single server', function () {
    let usecase

    before(function () {
      const entityRepository = new EntityRepository()
      usecase = PatchUser({
        getDomainLeader: () => { return null },
        getDomainMembers: () => [],
        entityRepository: entityRepository
      })
    })

    after(function () {
      sinon.restore()
    })

    it('should raise an error for invalid input', async function () {
      assert.throws(() => PatchUser({
        getDomainLeader: null,
        getDomainMembers: () => [],
        entityRepository: {}
      }), AssertionError)
      assert.throws(() => PatchUser({
        getDomainLeader: () => { return null },
        getDomainMembers: null,
        entityRepository: {}
      }), AssertionError)
      assert.throws(() => PatchUser({
        getDomainLeader: () => { return null },
        getDomainMembers: () => [],
        entityRepository: null
      }), AssertionError)
      try {
        await usecase(null, null)
        assert.fail('should have raised error')
      } catch (err) {
        assert.include(err.message, 'user identifier must be defined')
      }
      try {
        await usecase('username', null)
        assert.fail('should have raised error')
      } catch (err) {
        assert.include(err.message, 'patch must be defined')
      }
    })

    it('should reject missing user entity', async function () {
      // arrange
      const getStub = sinon.stub(EntityRepository.prototype, 'getUser').callsFake((username) => {
        assert.isNotNull(username)
        return Promise.resolve(null)
      })
      const addStub = sinon.stub(EntityRepository.prototype, 'updateUser').callsFake((user) => {
        assert.isNotNull(user)
        return Promise.resolve(null)
      })
      // act
      const patch = {
        schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
        Operations: [
          { op: 'replace', path: 'name.formatted', value: 'Joe Plumber' }
        ]
      }
      try {
        await usecase('joeuser', patch)
        assert.fail('should raise error')
      } catch (err) {
        assert.instanceOf(err, NoSuchUserError)
      }
      // assert
      assert.isTrue(getStub.calledOnce)
      assert.isTrue(addStub.notCalled)
      getStub.restore()
      addStub.restore()
    })

    it('should succeed when changing user fullname', async function () {
      // arrange
      const getStub = sinon.stub(EntityRepository.prototype, 'getUser').callsFake((username) => {
        assert.equal(username, 'joeuser')
        return Promise.resolve(new User('joeuser', 'joeuser@example.com', 'Joe Q. User'))
      })
      const addStub = sinon.stub(EntityRepository.prototype, 'updateUser').callsFake((user) => {
        assert.isNotNull(user)
        return Promise.resolve(user)
      })
      // act
      const patch = {
        schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
        Operations: [
          { op: 'replace', path: 'name.formatted', value: 'Joe Plumber' }
        ]
      }
      const updated = await usecase('joeuser', patch)
      // assert
      assert.equal(updated.fullname, 'Joe Plumber')
      assert.isTrue(getStub.calledOnce)
      assert.isTrue(addStub.calledOnce)
      getStub.restore()
      addStub.restore()
    })

    it('should permit renaming a user', async function () {
      // arrange
      const getStub = sinon.stub(EntityRepository.prototype, 'getUser').callsFake((username) => {
        assert.equal(username, 'joeuser')
        return Promise.resolve(new User('joeuser', 'joeuser@example.com', 'Joe Q. User'))
      })
      const renameStub = sinon.stub(EntityRepository.prototype, 'renameUser').callsFake((alt, neu) => {
        assert.equal(alt, 'joeuser')
        assert.equal(neu, 'userjoe')
        return Promise.resolve()
      })
      const updateStub = sinon.stub(EntityRepository.prototype, 'updateUser').callsFake((user) => {
        assert.isNotNull(user)
        return Promise.resolve(user)
      })
      // act
      const patch = {
        schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
        Operations: [
          { op: 'replace', path: 'userName', value: 'userjoe' }
        ]
      }
      const updated = await usecase('joeuser', patch)
      // assert
      assert.equal(updated.username, 'userjoe')
      assert.isTrue(getStub.calledOnce)
      assert.isTrue(renameStub.calledOnce)
      assert.isTrue(updateStub.calledOnce)
      getStub.restore()
      renameStub.restore()
      updateStub.restore()
    })

    it('should permit changing active status', async function () {
      // arrange
      const getStub = sinon.stub(EntityRepository.prototype, 'getUser').callsFake((username) => {
        assert.equal(username, 'joeuser')
        return Promise.resolve(new User('joeuser', 'joeuser@example.com', 'Joe Q. User'))
      })
      const addStub = sinon.stub(EntityRepository.prototype, 'updateUser').callsFake((user) => {
        assert.isNotNull(user)
        return Promise.resolve(user)
      })
      // act
      const patch = {
        schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
        Operations: [
          // an actual patch sent by Azure AD
          { op: 'Replace', path: 'active', value: 'False' }
        ]
      }
      const updated = await usecase('joeuser', patch)
      // assert
      assert.equal(updated.username, 'joeuser')
      assert.equal(updated.email, 'joeuser@example.com')
      assert.equal(updated.fullname, 'Joe Q. User')
      assert.isFalse(updated.active)
      assert.isTrue(getStub.calledOnce)
      assert.isTrue(addStub.calledOnce)
      getStub.restore()
      addStub.restore()
    })

    it('should ignore changes to other properties', async function () {
      // arrange
      const getStub = sinon.stub(EntityRepository.prototype, 'getUser').callsFake((username) => {
        assert.equal(username, 'joeuser')
        return Promise.resolve(new User('joeuser', 'joeuser@example.com', 'Joe Q. User'))
      })
      const addStub = sinon.stub(EntityRepository.prototype, 'updateUser').callsFake((user) => {
        assert.isNotNull(user)
        return Promise.resolve(user)
      })
      // act
      const patch = {
        schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
        Operations: [
          { op: 'replace', path: 'ignored', value: 'foobar' }
        ]
      }
      const updated = await usecase('joeuser', patch)
      // assert
      assert.equal(updated.username, 'joeuser')
      assert.equal(updated.email, 'joeuser@example.com')
      assert.equal(updated.fullname, 'Joe Q. User')
      assert.isTrue(updated.active)
      assert.isTrue(getStub.calledOnce)
      assert.isTrue(addStub.notCalled)
      getStub.restore()
      addStub.restore()
    })
  })

  describe('multiple servers', function () {
    let usecase

    before(function () {
      const entityRepository = new EntityRepository()
      usecase = PatchUser({
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
      const getStub = sinon.stub(EntityRepository.prototype, 'getUser').callsFake(() => {
        return Promise.resolve(new User('joeuser', 'joeuser@example.com', 'Joe Q. User'))
      })
      const updateStub = sinon.stub(EntityRepository.prototype, 'updateUser').callsFake((user) => {
        assert.isNotNull(user)
        return Promise.resolve(user)
      })
      // act
      const patch = {
        schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
        Operations: [
          { op: 'replace', path: 'name.formatted', value: 'Joe Plumber' }
        ]
      }
      const updated = await usecase('joeuser', patch, 'canine')
      // assert
      assert.equal(updated.fullname, 'Joe Plumber')
      assert.isTrue(getStub.calledOnce)
      sinon.assert.calledWith(
        getStub,
        sinon.match('joeuser'),
        sinon.match.has('p4port', 'ssl:chicago:1666')
      )
      assert.isTrue(updateStub.calledTwice)
      sinon.assert.calledWith(
        updateStub,
        sinon.match.has('username', 'joeuser'),
        sinon.match.has('p4port', 'ssl:chicago:1666')
      )
      sinon.assert.calledWith(
        updateStub,
        sinon.match.has('username', 'joeuser'),
        sinon.match.has('p4port', 'ssl:tokyo:1666')
      )
      getStub.restore()
      updateStub.restore()
    })
  })
})
