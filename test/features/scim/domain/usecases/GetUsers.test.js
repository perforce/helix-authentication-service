//
// Copyright 2021 Perforce Software
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
  let usecase

  before(function () {
    const entityRepository = new EntityRepository()
    usecase = GetUsers({ entityRepository })
  })

  after(function () {
    sinon.restore()
  })

  it('should raise an error for invalid input', async function () {
    assert.throws(() => GetUsers({ entityRepository: null }), AssertionError)
    try {
      await usecase(null)
      assert.fail('should have raised error')
    } catch (err) {
      assert.instanceOf(err, AssertionError)
    }
  })

  it('should return [] when no users available', async function () {
    // arrange
    // eslint-disable-next-line no-unused-vars
    const stub = sinon.stub(EntityRepository.prototype, 'getUsers').callsFake((query) => {
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

  it('should return one entry when one user exists', async function () {
    // arrange
    const tUser = new User('joeuser', 'joeuser@example.com', 'Joe Q. User')
    // eslint-disable-next-line no-unused-vars
    const stub = sinon.stub(EntityRepository.prototype, 'getUsers').callsFake((query) => {
      return [tUser]
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
    // eslint-disable-next-line no-unused-vars
    const stub = sinon.stub(EntityRepository.prototype, 'getUsers').callsFake((query) => {
      return [tUser1, tUser2, tUser3]
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
    // eslint-disable-next-line no-unused-vars
    const stub = sinon.stub(EntityRepository.prototype, 'getUsers').callsFake((query) => {
      return [tUser1, tUser2, tUser3]
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
    // eslint-disable-next-line no-unused-vars
    const stub = sinon.stub(EntityRepository.prototype, 'getUsers').callsFake((query) => {
      return [tUser3, tUser2, tUser1]
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
    // eslint-disable-next-line no-unused-vars
    const stub = sinon.stub(EntityRepository.prototype, 'getUsers').callsFake((query) => {
      return [tUser3, tUser2, tUser1]
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
