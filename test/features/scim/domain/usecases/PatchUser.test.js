//
// Copyright 2021 Perforce Software
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
  let usecase

  before(function () {
    const entityRepository = new EntityRepository()
    usecase = PatchUser({ entityRepository: entityRepository })
  })

  after(function () {
    sinon.restore()
  })

  it('should raise an error for invalid input', async function () {
    assert.throws(() => PatchUser({ entityRepository: null }), AssertionError)
    try {
      await usecase(null, null)
      assert.fail('should have raised error')
    } catch (err) {
      assert.instanceOf(err, AssertionError)
    }
    try {
      await usecase('username', null)
      assert.fail('should have raised error')
    } catch (err) {
      assert.instanceOf(err, AssertionError)
    }
  })

  it('should reject missing user entity', async function () {
    // arrange
    const getStub = sinon.stub(EntityRepository.prototype, 'getUser').callsFake((username) => {
      assert.isNotNull(username)
      return null
    })
    const addStub = sinon.stub(EntityRepository.prototype, 'updateUser').callsFake((user) => {
      assert.isNotNull(user)
      return null
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
      return new User('joeuser', 'joeuser@example.com', 'Joe Q. User')
    })
    const addStub = sinon.stub(EntityRepository.prototype, 'updateUser').callsFake((user) => {
      assert.isNotNull(user)
      return user
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
      return new User('joeuser', 'joeuser@example.com', 'Joe Q. User')
    })
    const renameStub = sinon.stub(EntityRepository.prototype, 'renameUser').callsFake((alt, neu) => {
      assert.equal(alt, 'joeuser')
      assert.equal(neu, 'userjoe')
    })
    const updateStub = sinon.stub(EntityRepository.prototype, 'updateUser').callsFake((user) => {
      assert.isNotNull(user)
      return user
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

  it('should ignore changes to other properties', async function () {
    // arrange
    const getStub = sinon.stub(EntityRepository.prototype, 'getUser').callsFake((username) => {
      assert.equal(username, 'joeuser')
      return new User('joeuser', 'joeuser@example.com', 'Joe Q. User')
    })
    const addStub = sinon.stub(EntityRepository.prototype, 'updateUser').callsFake((user) => {
      assert.isNotNull(user)
      return null
    })
    // act
    const patch = {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
      Operations: [
        { op: 'replace', path: 'active', value: 'false' }
      ]
    }
    const updated = await usecase('joeuser', patch)
    // assert
    assert.equal(updated.username, 'joeuser')
    assert.equal(updated.email, 'joeuser@example.com')
    assert.equal(updated.fullname, 'Joe Q. User')
    assert.isTrue(getStub.calledOnce)
    assert.isTrue(addStub.notCalled)
    getStub.restore()
    addStub.restore()
  })
})
