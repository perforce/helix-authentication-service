//
// Copyright 2020 Perforce Software
//
const { AssertionError } = require('assert')
const { assert } = require('chai')
const { before, describe, it } = require('mocha')
const Request = require('@login/domain/entities/Request')
const InMemoryRequestRepository = require('@login/data/repositories/InMemoryRequestRepository')

describe('InMemoryRequest repository', function () {
  let repository

  before(function () {
    repository = new InMemoryRequestRepository()
  })

  it('should raise an error for invalid input', function () {
    assert.throws(() => repository.add(null), AssertionError)
    assert.throws(() => repository.add('foobar', null), AssertionError)
    assert.throws(() => repository.get(null), AssertionError)
  })

  it('should return null for missing request entity', function () {
    // act
    const request = repository.get('foobar')
    // assert
    assert.isNull(request)
  })

  it('should find an existing request entity', function () {
    // arrange
    const requestId = 'request123'
    const userId = 'joeuser'
    const tRequest = new Request(requestId, userId, false)
    repository.add(requestId, tRequest)
    // act
    const request = repository.get(requestId)
    // assert
    assert.property(request, 'id')
    assert.equal(request.id, requestId)
    assert.property(request, 'userId')
    assert.equal(request.userId, userId)
  })
})
