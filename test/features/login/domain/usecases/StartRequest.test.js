//
// Copyright 2020-2021 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { after, before, describe, it } from 'mocha'
import sinon from 'sinon'
import StartRequest from 'helix-auth-svc/lib/features/login/domain/usecases/StartRequest.js'
import { RequestRepository } from 'helix-auth-svc/lib/features/login/domain/repositories/RequestRepository.js'

describe('StartRequest use case', function () {
  let usecase

  before(function () {
    const requestRepository = new RequestRepository()
    usecase = StartRequest({ requestRepository })
  })

  after(function () {
    sinon.restore()
  })

  it('should raise an error for invalid input', function () {
    assert.throws(() => StartRequest({ requestRepository: null }), AssertionError)
    assert.throws(() => usecase(null), AssertionError)
  })

  it('should create a request entity with a random identifier', function () {
    // arrange
    const stub = sinon.stub(RequestRepository.prototype, 'add')
    // act
    const request = usecase('joe', false)
    // assert
    assert.isNotNull(request.id)
    assert.equal(request.id.length, 26)
    assert.equal(request.userId, 'joe')
    assert.isFalse(request.forceAuthn)
    assert.isTrue(stub.calledOnce)
    stub.restore()
  })

  it('should create a request entity with a specified identifier', function () {
    // arrange
    const stub = sinon.stub(RequestRepository.prototype, 'add').callsFake((requestId, request) => {
      assert.equal(requestId, 'request123')
      assert.equal(request.userId, 'joe')
    })
    // act
    const request = usecase('joe', false, 'request123')
    // assert
    assert.isNotNull(request.id)
    assert.equal(request.id, 'request123')
    assert.isNotNull(request.userId)
    assert.equal(request.userId, 'joe')
    assert.isFalse(request.forceAuthn)
    assert.isTrue(stub.calledOnce)
    stub.restore()
  })
})
