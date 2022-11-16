//
// Copyright 2022 Perforce Software
//
import { assert } from 'chai'
import { after, before, describe, it } from 'mocha'
import * as helpers from 'helix-auth-svc/test/helpers.js'
import * as runner from 'helix-auth-svc/test/runner.js'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'
import { HelixCredentialsRepository } from 'helix-auth-svc/lib/features/admin/data/repositories/HelixCredentialsRepository.js'

describe('helix credentials repository', function () {
  let repository
  let p4config

  before(async function () {
    if (process.env.UNIT_ONLY) {
      this.skip()
    } else {
      this.timeout(30000)
      p4config = await runner.startServer('./tmp/p4d/creds-repo')
      helpers.establishSuper(p4config)
      const map = new Map()
      map.set('P4PORT', p4config.port)
      const settings = new MapSettingsRepository(map)
      repository = new HelixCredentialsRepository({ settingsRepository: settings })
    }
  })

  after(async function () {
    if (process.env.UNIT_ONLY === undefined) {
      this.timeout(30000)
      await runner.stopServer(p4config)
    }
  })

  it('should raise an error for invalid input', async function () {
    try {
      await repository.verify(null, 'foobar')
      assert.fail('should have raised Error')
    } catch (err) {
      assert.include(err.message, 'username must be defined')
    }
    try {
      await repository.verify('foobar', null)
      assert.fail('should have raised Error')
    } catch (err) {
      assert.include(err.message, 'password must be defined')
    }
  })

  it('should return true when protections table empty', async function () {
    // arrange
    // act
    const result = await repository.verify('bruno', 'p8ssword')
    // assert
    assert.isTrue(result)
  })

  it('should return false for non-matching credentials', async function () {
    // arrange
    // act
    const result = await repository.verify('susan', 'foobar')
    // assert
    assert.isFalse(result)
  })

  it('should return false for unprivileged user', async function () {
    // arrange
    helpers.establishProtects(p4config)
    helpers.createUser({
      User: 'susan',
      Email: 'susan@example.com',
      FullName: 'Susan Powers'
    }, 'p8ssword', p4config)
    // act
    const result = await repository.verify('susan', 'p8ssword')
    // assert
    assert.isFalse(result)
  })

  it('should return true for successful super login', async function () {
    // arrange
    // act
    const result = await repository.verify('bruno', 'p8ssword')
    // assert
    assert.isTrue(result)
  })
})
