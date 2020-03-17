//
// Copyright 2020 Perforce Software
//
const { AssertionError } = require('assert')
const { assert } = require('chai')
const { after, before, describe, it } = require('mocha')
const sinon = require('sinon')
const StartRequest = require('@login/domain/usecases/StartRequest')
const RequestRepository = require('@login/domain/repositories/RequestRepository')

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

  it('should create a request entity', function () {
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
})
