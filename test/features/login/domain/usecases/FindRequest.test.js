//
// Copyright 2020 Perforce Software
//
const { AssertionError } = require('assert')
const { assert } = require('chai')
const { after, before, describe, it } = require('mocha')
const sinon = require('sinon')
const Request = require('@login/domain/entities/Request')
const FindRequest = require('@login/domain/usecases/FindRequest')
const RequestRepository = require('@login/domain/repositories/RequestRepository')

describe('FindRequest use case', function () {
  let usecase

  before(function () {
    const requestRepository = new RequestRepository()
    usecase = FindRequest({ requestRepository })
  })

  after(function () {
    sinon.restore()
  })

  it('should raise an error for invalid input', function () {
    assert.throws(() => FindRequest({ requestRepository: null }), AssertionError)
    assert.throws(() => usecase(null), AssertionError)
  })

  it('should return null for a missing request entity', function () {
    // arrange
    // eslint-disable-next-line no-unused-vars
    const stub = sinon.stub(RequestRepository.prototype, 'get').callsFake((id) => {
      return null
    })
    // act
    const request = usecase('123456')
    // assert
    assert.isNull(request)
    assert.isTrue(stub.calledOnce)
    stub.restore()
  })

  it('should find an existing request entity', function () {
    // arrange
    const tRequest = new Request('request123', 'joeuser', false)
    // eslint-disable-next-line no-unused-vars
    const stub = sinon.stub(RequestRepository.prototype, 'get').callsFake((id) => {
      return tRequest
    })
    // act
    const request = usecase(tRequest.id)
    // assert
    assert.isNotNull(request.id)
    assert.equal(request.id, tRequest.id)
    assert.equal(request.userId, 'joeuser')
    assert.isFalse(request.forceAuthn)
    assert.isTrue(stub.calledOnce)
    stub.restore()
  })
})
