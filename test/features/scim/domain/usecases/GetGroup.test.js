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

const Group = include('lib/features/scim/domain/entities/Group')
const GetGroup = include('lib/features/scim/domain/usecases/GetGroup')
const EntityRepository = include('lib/features/scim/domain/repositories/EntityRepository')

describe('GetGroup use case', function () {
  let usecase

  before(function () {
    const entityRepository = new EntityRepository()
    usecase = GetGroup({ entityRepository: entityRepository })
  })

  after(function () {
    sinon.restore()
  })

  it('should raise an error for invalid input', async function () {
    assert.throws(() => GetGroup({ entityRepository: null }), AssertionError)
    try {
      await usecase(null)
      assert.fail('should have raised error')
    } catch (err) {
      assert.instanceOf(err, AssertionError)
    }
  })

  it('should return null for a missing group entity', function () {
    // arrange
    // eslint-disable-next-line no-unused-vars
    const stub = sinon.stub(EntityRepository.prototype, 'getGroup').callsFake((id) => {
      return null
    })
    // act
    const user = usecase('staff')
    // assert
    assert.isNull(user)
    assert.isTrue(stub.calledOnce)
    stub.restore()
  })

  it('should find an existing user entity', function () {
    // arrange
    const tGroup = new Group('staff', ['sam', 'frodo'])
    // eslint-disable-next-line no-unused-vars
    const stub = sinon.stub(EntityRepository.prototype, 'getGroup').callsFake((id) => {
      return tGroup
    })
    // act
    const group = usecase('staff')
    // assert
    assert.equal(group.displayName, 'staff')
    assert.lengthOf(group.members, 2)
    assert.isOk(group.members.find((e) => e === 'sam'))
    assert.isOk(group.members.find((e) => e === 'frodo'))
    assert.isTrue(stub.calledOnce)
    stub.restore()
  })
})
