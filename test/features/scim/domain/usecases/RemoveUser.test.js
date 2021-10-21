//
// Copyright 2021 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { after, before, describe, it } from 'mocha'
import sinon from 'sinon'
import RemoveUser from 'helix-auth-svc/lib/features/scim/domain/usecases/RemoveUser.js'
import { EntityRepository } from 'helix-auth-svc/lib/features/scim/domain/repositories/EntityRepository.js'

describe('RemoveUser use case', function () {
  let usecase

  before(function () {
    const entityRepository = new EntityRepository()
    usecase = RemoveUser({ entityRepository: entityRepository })
  })

  after(function () {
    sinon.restore()
  })

  it('should raise an error for invalid input', async function () {
    assert.throws(() => RemoveUser({ entityRepository: null }), AssertionError)
    try {
      await usecase(null)
      assert.fail('should have raised error')
    } catch (err) {
      assert.instanceOf(err, AssertionError)
    }
  })

  it('should succeed for a missing user entity', async function () {
    // arrange
    // eslint-disable-next-line no-unused-vars
    const stub = sinon.stub(EntityRepository.prototype, 'removeUser').callsFake((id) => {
      return null
    })
    // act
    const result = await usecase('123456')
    // assert
    assert.isNull(result)
    assert.isTrue(stub.calledOnce)
    stub.restore()
  })

  it('should succeed an existing user entity', async function () {
    // arrange
    // eslint-disable-next-line no-unused-vars
    const stub = sinon.stub(EntityRepository.prototype, 'removeUser').callsFake((id) => {
      return null
    })
    // act
    const result = await usecase('joeuser')
    // assert
    assert.isNull(result)
    assert.isTrue(stub.calledOnce)
    stub.restore()
  })
})
