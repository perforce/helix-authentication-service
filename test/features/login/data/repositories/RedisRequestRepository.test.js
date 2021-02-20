//
// Copyright 2020 Perforce Software
//
const { AssertionError } = require('assert')
const { assert } = require('chai')
const { before, describe, it } = require('mocha')
const path = require('path')

/* global include */
global.include = (p) => require(path.join(__dirname, '../../../../..', p))

process.env.REDIS_URL = 'redis://redis.doc:6379'

const Request = include('lib/features/login/domain/entities/Request')
const RedisRequestRepository = include('lib/features/login/data/repositories/RedisRequestRepository')

describe('RedisRequest repository', function () {
  let repository

  before(function () {
    repository = new RedisRequestRepository()
  })

  it('should raise an error for invalid input', function () {
    assert.throws(() => repository.add(null), AssertionError)
    assert.throws(() => repository.add('foobar', null), AssertionError)
    assert.throws(() => repository.get(null), AssertionError)
  })

  it('should return null for missing request entity', async function () {
    // act
    const request = await repository.get('foobar')
    // assert
    assert.isNull(request)
  })

  it('should find an existing request entity', async function () {
    // arrange
    const requestId = 'request123'
    const userId = 'joeuser'
    const tRequest = new Request(requestId, userId, false)
    repository.add(requestId, tRequest)
    // act
    const request = await repository.get(requestId)
    // assert
    assert.property(request, 'id')
    assert.equal(request.id, requestId)
    assert.property(request, 'userId')
    assert.equal(request.userId, userId)
  })
})
