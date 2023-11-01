//
// Copyright 2023 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { after, before, describe, it } from 'mocha'
import sinon from 'sinon'
import { User } from 'helix-auth-svc/lib/features/scim/domain/entities/User.js'
import { NoSuchUserError } from 'helix-auth-svc/lib/features/scim/domain/errors/NoSuchUserError.js'
import UpdateUser from 'helix-auth-svc/lib/features/scim/domain/usecases/UpdateUser.js'
import { EntityRepository } from 'helix-auth-svc/lib/features/scim/domain/repositories/EntityRepository.js'

describe('UpdateUser use case', function () {
  let usecase

  before(function () {
    const entityRepository = new EntityRepository()
    usecase = UpdateUser({
      getDomainLeader: () => { return null },
      getDomainMembers: () => [],
      entityRepository: entityRepository
    })
  })

  after(function () {
    sinon.restore()
  })

  it('should raise an error for invalid input', async function () {
    assert.throws(() => UpdateUser({
      getDomainLeader: null,
      getDomainMembers: () => [],
      entityRepository: {}
    }), AssertionError)
    assert.throws(() => UpdateUser({
      getDomainLeader: () => { return null },
      getDomainMembers: null,
      entityRepository: {}
    }), AssertionError)
    assert.throws(() => UpdateUser({
      getDomainLeader: () => { return null },
      getDomainMembers: () => [],
      entityRepository: null
    }), AssertionError)
    try {
      await usecase(null)
      assert.fail('should have raised error')
    } catch (err) {
      assert.include(err.message, 'username must be defined')
    }
    try {
      await usecase('username', null)
      assert.fail('should have raised error')
    } catch (err) {
      assert.include(err.message, 'user record must be defined')
    }
  })

  it('should reject missing user entity', async function () {
    // arrange
    const getStub = sinon.stub(EntityRepository.prototype, 'getUser').callsFake((username) => {
      assert.equal(username, 'joeuser')
      return Promise.resolve(null)
    })
    const addStub = sinon.stub(EntityRepository.prototype, 'updateUser').callsFake((user) => {
      assert.isNotNull(user)
      return Promise.resolve(null)
    })
    // act
    try {
      const tUser = new User('joeuser', 'joeuser@example.com', 'Joe Q. User')
      await usecase('joeuser', tUser)
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

  it('should succeed when updating existing user entity', async function () {
    // arrange
    const tUser = new User('joeuser', 'joeuser@example.com', 'Joe Q. User')
    const getStub = sinon.stub(EntityRepository.prototype, 'getUser').callsFake((username) => {
      assert.equal(username, 'joeuser')
      return Promise.resolve(tUser)
    })
    const updateStub = sinon.stub(EntityRepository.prototype, 'updateUser').callsFake((user) => {
      assert.isNotNull(user)
      return Promise.resolve(user)
    })
    // act
    const updated = await usecase('joeuser', tUser)
    // assert
    assert.propertyVal(updated, 'username', 'joeuser')
    assert.isTrue(getStub.calledOnce)
    assert.isTrue(updateStub.calledOnce)
    getStub.restore()
    updateStub.restore()
  })

  it('should support renaming an existing user entity', async function () {
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
      assert.equal(user.username, 'userjoe')
      return Promise.resolve(user)
    })
    // act
    const tUser = new User('userjoe', 'joeuser@example.com', 'Joe Q. User')
    const renamed = await usecase('joeuser', tUser)
    // assert
    assert.equal(renamed.username, 'userjoe')
    assert.isTrue(getStub.calledOnce)
    assert.isTrue(renameStub.calledOnce)
    assert.isTrue(updateStub.calledOnce)
    getStub.restore()
    renameStub.restore()
    updateStub.restore()
  })

  describe('multiple servers', function () {
    let usecase

    before(function () {
      const entityRepository = new EntityRepository()
      usecase = UpdateUser({
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

    it('should update user on all domain members', async function () {
      // arrange
      const tUser = new User('joeuser', 'joeuser@example.com', 'Joe Q. User')
      const getStub = sinon.stub(EntityRepository.prototype, 'getUser').callsFake((username) => {
        assert.equal(username, 'joeuser')
        return Promise.resolve(tUser)
      })
      const updateStub = sinon.stub(EntityRepository.prototype, 'updateUser').callsFake((user) => {
        assert.isNotNull(user)
        return Promise.resolve(user)
      })
      // act
      const updated = await usecase('joeuser', tUser)
      // assert
      assert.propertyVal(updated, 'username', 'joeuser')
      assert.isTrue(getStub.calledOnce)
      sinon.assert.calledWith(
        getStub,
        sinon.match('joeuser'),
        sinon.match.has('p4port', 'ssl:chicago:1666')
      )
      assert.isTrue(updateStub.calledTwice)
      sinon.assert.calledWith(
        updateStub,
        sinon.match.has('userName', 'joeuser'),
        sinon.match.has('p4port', 'ssl:chicago:1666')
      )
      sinon.assert.calledWith(
        updateStub,
        sinon.match.has('userName', 'joeuser'),
        sinon.match.has('p4port', 'ssl:tokyo:1666')
      )
      getStub.restore()
      updateStub.restore()
    })
  })
})
