//
// Copyright 2020-2022 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { after, before, describe, it } from 'mocha'
import sinon from 'sinon'
import { Request } from 'helix-auth-svc/lib/features/login/domain/entities/Request.js'
import FindRequest from 'helix-auth-svc/lib/features/login/domain/usecases/FindRequest.js'
import { RequestRepository } from 'helix-auth-svc/lib/features/login/domain/repositories/RequestRepository.js'

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
  })

  it('should return null for null/undefined requestId', function () {
    // assert
    assert.isNull(usecase(undefined))
    assert.isNull(usecase(null))
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
