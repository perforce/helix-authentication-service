//
// Copyright 2021 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { after, before, describe, it } from 'mocha'
import sinon from 'sinon'
import { User } from 'helix-auth-svc/lib/features/scim/domain/entities/User.js'
import GetUser from 'helix-auth-svc/lib/features/scim/domain/usecases/GetUser.js'
import { EntityRepository } from 'helix-auth-svc/lib/features/scim/domain/repositories/EntityRepository.js'

describe('GetUser use case', function () {
  let usecase

  before(function () {
    const entityRepository = new EntityRepository()
    usecase = GetUser({ entityRepository: entityRepository })
  })

  after(function () {
    sinon.restore()
  })

  it('should raise an error for invalid input', async function () {
    assert.throws(() => GetUser({ entityRepository: null }), AssertionError)
    try {
      await usecase(null)
      assert.fail('should have raised error')
    } catch (err) {
      assert.instanceOf(err, AssertionError)
    }
  })

  it('should return null for a missing user entity', function () {
    // arrange
    // eslint-disable-next-line no-unused-vars
    const stub = sinon.stub(EntityRepository.prototype, 'getUser').callsFake((id) => {
      return null
    })
    // act
    const user = usecase('123456')
    // assert
    assert.isNull(user)
    assert.isTrue(stub.calledOnce)
    stub.restore()
  })

  it('should find an existing user entity', function () {
    // arrange
    const tUser = new User('joeuser', 'joeuser@example.com', 'Joe Q. User')
    // eslint-disable-next-line no-unused-vars
    const stub = sinon.stub(EntityRepository.prototype, 'getUser').callsFake((id) => {
      return tUser
    })
    // act
    const user = usecase(tUser.username)
    // assert
    assert.isNotNull(user.username)
    assert.equal(user.username, tUser.username)
    assert.equal(user.fullname, 'Joe Q. User')
    assert.isTrue(stub.calledOnce)
    stub.restore()
  })
})
