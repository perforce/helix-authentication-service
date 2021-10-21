//
// Copyright 2020-2021 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { before, describe, it } from 'mocha'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'
import { Request } from 'helix-auth-svc/lib/features/login/domain/entities/Request.js'
import { RedisRequestRepository } from 'helix-auth-svc/lib/features/login/data/repositories/RedisRequestRepository.js'

describe('RedisRequest repository', function () {
  let repository

  before(function () {
    const map = new Map()
    map.set('REDIS_URL', 'redis://redis.doc:6379')
    const settingsRepository = new MapSettingsRepository(map)
    repository = new RedisRequestRepository({ settingsRepository })
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
