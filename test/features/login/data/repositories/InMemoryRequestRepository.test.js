//
// Copyright 2020-2021 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { before, describe, it } from 'mocha'
import { ulid } from 'ulid'
import { Request } from 'helix-auth-svc/lib/features/login/domain/entities/Request.js'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'
import { InMemoryRequestRepository } from 'helix-auth-svc/lib/features/login/data/repositories/InMemoryRequestRepository.js'

describe('InMemoryRequest repository', function () {
  let repository

  before(function () {
    const map = new Map()
    map.set('CACHE_TTL', '2')
    const settings = new MapSettingsRepository(map)
    repository = new InMemoryRequestRepository({ settingsRepository: settings })
  })

  it('should raise an error for invalid input', function () {
    assert.throws(() => repository.add(null), AssertionError)
    assert.throws(() => repository.add('foobar', null), AssertionError)
    assert.throws(() => repository.get(null), AssertionError)
  })

  it('should return null for missing request entity', async function () {
    // arrange
    const requestId = ulid()
    // act
    const request = await repository.get(requestId)
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

  it('should clear expired request entries', function (done) {
    this.timeout(5000)
    // arrange
    const requestId = 'request456'
    const userId = 'joesample'
    const tRequest = new Request(requestId, userId, false)
    // act
    repository.add(requestId, tRequest)
    // assert
    setTimeout(() => {
      repository.get(requestId).then((value) => {
        if (value) {
          throw new AssertionError({ message: 'value is not null' })
        }
        done()
      }).catch((err) => done(err))
    }, 4000)
  })
})
