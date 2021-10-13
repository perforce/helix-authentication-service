//
// Copyright 2021 Perforce Software
//
const { AssertionError } = require('assert')
const { assert } = require('chai')
const { after, before, describe, it } = require('mocha')
const sinon = require('sinon')
const path = require('path')

/* global include */
global.include = (p) => require(path.join(__dirname, '../../../../..', p))

const User = include('lib/features/scim/domain/entities/User')
const GetUser = include('lib/features/scim/domain/usecases/GetUser')
const EntityRepository = include('lib/features/scim/domain/repositories/EntityRepository')

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
