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

const RemoveGroup = include('lib/features/scim/domain/usecases/RemoveGroup')
const EntityRepository = include('lib/features/scim/domain/repositories/EntityRepository')

describe('RemoveGroup use case', function () {
  let usecase

  before(function () {
    const entityRepository = new EntityRepository()
    usecase = RemoveGroup({ entityRepository: entityRepository })
  })

  after(function () {
    sinon.restore()
  })

  it('should raise an error for invalid input', async function () {
    assert.throws(() => RemoveGroup({ entityRepository: null }), AssertionError)
    try {
      await usecase(null)
      assert.fail('should have raised error')
    } catch (err) {
      assert.instanceOf(err, AssertionError)
    }
  })

  it('should succeed for a missing group entity', async function () {
    // arrange
    // eslint-disable-next-line no-unused-vars
    const stub = sinon.stub(EntityRepository.prototype, 'removeGroup').callsFake((id) => {
      assert.equal(id, 'staff')
      return null
    })
    // act
    const result = await usecase('staff')
    // assert
    assert.isNull(result)
    assert.isTrue(stub.calledOnce)
    stub.restore()
  })

  it('should succeed an existing group entity', async function () {
    // arrange
    // eslint-disable-next-line no-unused-vars
    const stub = sinon.stub(EntityRepository.prototype, 'removeGroup').callsFake((id) => {
      assert.equal(id, 'staff')
      return null
    })
    // act
    const result = await usecase('staff')
    // assert
    assert.isNull(result)
    assert.isTrue(stub.calledOnce)
    stub.restore()
  })
})
