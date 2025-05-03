//
// Copyright 2023 Perforce Software
//
import { assert } from 'chai'
import { after, before, describe, it } from 'mocha'
import * as helpers from 'helix-auth-svc/test/helpers.js'
import * as runner from 'helix-auth-svc/test/runner.js'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'
import { HelixCredentialsRepository } from 'helix-auth-svc/lib/features/admin/data/repositories/HelixCredentialsRepository.js'

describe('helix credentials repository', function () {
  const settingsRepository = new MapSettingsRepository()

  before(function () {
    if (process.env.UNIT_ONLY) {
      this.skip()
    }
  })

  describe('Non-SSL', function () {
    let repository
    let p4config

    before(async function () {
      this.timeout(60000)
      p4config = await runner.startServer('./tmp/p4d/creds-nonssl')
      helpers.establishSuper(p4config)
      settingsRepository.set('P4PORT', p4config.port)
      settingsRepository.set('P4TICKETS', p4config.tickets)
      repository = new HelixCredentialsRepository({ settingsRepository })
    })

    after(async function () {
      this.timeout(60000)
      await runner.stopServer(p4config)
    })

    it('should raise an error for invalid input', async function () {
      this.timeout(60000)
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
      this.timeout(60000)
      // arrange
      // act
      const result = await repository.verify('bruno', 'p8ssword')
      // assert
      assert.isTrue(result)
    })

    it('should return false for non-matching credentials', async function () {
      this.timeout(60000)
      // arrange
      // act
      const result = await repository.verify('susan', 'foobar')
      // assert
      assert.isFalse(result)
    })

    it('should return false for unprivileged user', async function () {
      this.timeout(60000)
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
      this.timeout(60000)
      // arrange
      // act
      const result = await repository.verify('bruno', 'p8ssword')
      // assert
      assert.isTrue(result)
    })
  })

  describe('SSL without trust', function () {
    let repository
    let p4config

    before(async function () {
      this.timeout(60000)
      p4config = await runner.startSslServer('./tmp/p4d/creds-untrust')
      settingsRepository.clear()
      settingsRepository.set('P4PORT', p4config.port)
      settingsRepository.set('P4USER', p4config.user)
      settingsRepository.set('P4PASSWD', p4config.password)
      settingsRepository.set('P4TICKETS', p4config.tickets)
      settingsRepository.set('P4TRUST', p4config.trust)
      repository = new HelixCredentialsRepository({ settingsRepository })
    })

    after(async function () {
      this.timeout(60000)
      helpers.establishTrust(p4config)
      await runner.stopServer(p4config)
    })

    it('should report untrusted connection', async function () {
      // arrange
      this.timeout(60000)
      try {
        await repository.verify('bruno', 'p8ssword')
        assert.fail('should have raised Error')
      } catch (err) {
        assert.match(err.message, /authenticity of .+? can't be established/)
      }
    })
  })

  describe('SSL trusted', function () {
    let repository
    let p4config

    before(async function () {
      this.timeout(60000)
      p4config = await runner.startSslServer('./tmp/p4d/creds-trust')
      helpers.establishTrust(p4config)
      helpers.establishSuper(p4config)
      settingsRepository.clear()
      settingsRepository.set('P4PORT', p4config.port)
      settingsRepository.set('P4USER', p4config.user)
      settingsRepository.set('P4PASSWD', p4config.password)
      settingsRepository.set('P4TICKETS', p4config.tickets)
      settingsRepository.set('P4TRUST', p4config.trust)
      repository = new HelixCredentialsRepository({ settingsRepository })
    })

    after(async function () {
      this.timeout(60000)
      await runner.stopServer(p4config)
    })

    it('should validate user over SSL connection', async function () {
      // arrange
      this.timeout(60000)
      // act
      const result = await repository.verify('bruno', 'p8ssword')
      // assert
      assert.isTrue(result)
    })
  })
})
