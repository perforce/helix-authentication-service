//
// Copyright 2022 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { before, describe, it } from 'mocha'
import { ulid } from 'ulid'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'
import { InMemoryTokenRepository } from 'helix-auth-svc/lib/features/admin/data/repositories/InMemoryTokenRepository.js'

describe('InMemoryToken repository', function () {
  let repository

  before(function () {
    const settings = new MapSettingsRepository()
    settings.set('TOKEN_TTL', '2')
    repository = new InMemoryTokenRepository({ settingsRepository: settings })
  })

  it('should raise an error for invalid input', function () {
    assert.throws(() => repository.set(null), AssertionError)
    assert.throws(() => repository.set('foobar', null), AssertionError)
    assert.throws(() => repository.get(null), AssertionError)
  })

  it('should return null for missing audience', async function () {
    // arrange
    const audience = ulid()
    // act
    const secret = await repository.get(audience)
    // assert
    assert.isNull(secret)
  })

  it('should find an existing registration', async function () {
    // arrange
    const audience = '92eeb813-de9e-4e60-bc57-5371f3dcf736'
    repository.set(audience, 'keyboard cat')
    // act
    const secret = await repository.get(audience)
    // assert
    assert.isString(secret)
    assert.equal(secret, 'keyboard cat')
  })

  it('should clear expired registrations', function (done) {
    this.timeout(5000)
    // arrange
    const audience = '92eeb813-de9e-4e60-bc57-5371f3dcf736'
    // act
    repository.set(audience, 'keyboard cat')
    // assert
    setTimeout(() => {
      repository.get(audience).then((value) => {
        if (value) {
          throw new AssertionError({ message: 'value is not null' })
        }
        done()
      }).catch((err) => done(err))
    }, 4000)
  })

  it('should remove an existing registration', async function () {
    // register and verify registration
    const audience = '92eeb813-de9e-4e60-bc57-5371f3dcf736'
    repository.set(audience, 'keyboard cat')
    const found = await repository.get(audience)
    assert.isString(found)
    assert.equal(found, 'keyboard cat')
    // remove and verify not longer found
    await repository.delete(audience)
    const removed = await repository.get(audience)
    assert.isNull(removed)
  })
})
