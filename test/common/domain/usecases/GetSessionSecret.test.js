//
// Copyright 2026 Perforce Software
//
import { AssertionError } from 'node:assert'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { assert } from 'chai'
import { after, before, beforeEach, describe, it } from 'mocha'
import sinon from 'sinon'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'
import GetSessionSecret from 'helix-auth-svc/lib/common/domain/usecases/GetSessionSecret.js'
import { DEFAULT_SECRET } from 'helix-auth-svc/lib/constants.js'

describe('GetSessionSecret use case', function () {
  const logger = { warning: sinon.stub() }

  beforeEach(function () {
    logger.warning.resetHistory()
  })

  it('should raise an error for invalid input', function () {
    assert.throws(() => GetSessionSecret({ settingsRepository: null, logger }), AssertionError)
    assert.throws(() => GetSessionSecret({ settingsRepository: new MapSettingsRepository(), logger: null }), AssertionError)
  })

  it('should return the configured secret', function () {
    const settingsRepository = new MapSettingsRepository()
    settingsRepository.set('SESSION_SECRET', ' my secret ')
    settingsRepository.set('REDIS_URL', 'redis://localhost:6379')
    const usecase = GetSessionSecret({ settingsRepository, logger })
    assert.equal(usecase(), 'my secret')
    assert.isFalse(logger.warning.called)
  })

  describe('with SESSION_SECRET_FILE', function () {
    let tmpdir
    let secretFile

    before(function () {
      tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'has-secret-'))
      secretFile = path.join(tmpdir, 'session-secret.txt')
      fs.writeFileSync(secretFile, 'from the file\n')
    })

    after(function () {
      fs.rmSync(tmpdir, { recursive: true, force: true })
    })

    it('should prefer the file over SESSION_SECRET', function () {
      const settingsRepository = new MapSettingsRepository()
      settingsRepository.set('SESSION_SECRET', 'from the setting')
      settingsRepository.set('SESSION_SECRET_FILE', secretFile)
      const usecase = GetSessionSecret({ settingsRepository, logger })
      assert.equal(usecase(), 'from the file')
    })

    it('should fail if the file cannot be read', function () {
      const settingsRepository = new MapSettingsRepository()
      settingsRepository.set('SESSION_SECRET_FILE', path.join(tmpdir, 'missing.txt'))
      const usecase = GetSessionSecret({ settingsRepository, logger })
      assert.throws(() => usecase(), /ENOENT/)
    })
  })

  describe('without a usable secret and without Redis', function () {
    it('should generate a random secret and warn when unset', function () {
      const settingsRepository = new MapSettingsRepository()
      const usecase = GetSessionSecret({ settingsRepository, logger })
      const first = usecase()
      const second = usecase()
      assert.isAtLeast(first.length, 32)
      assert.notEqual(first, DEFAULT_SECRET)
      assert.notEqual(first, second)
      assert.isTrue(logger.warning.calledTwice)
    })

    it('should not trust the well-known default value', function () {
      const settingsRepository = new MapSettingsRepository()
      settingsRepository.set('SESSION_SECRET', DEFAULT_SECRET)
      const usecase = GetSessionSecret({ settingsRepository, logger })
      assert.notEqual(usecase(), DEFAULT_SECRET)
      assert.isTrue(logger.warning.calledOnce)
    })
  })

  describe('without a usable secret and with Redis', function () {
    for (const name of ['REDIS_URL', 'SENTINEL_CONFIG']) {
      it(`should refuse to start when ${name} is set`, function () {
        const settingsRepository = new MapSettingsRepository()
        settingsRepository.set(name, 'something')
        const usecase = GetSessionSecret({ settingsRepository, logger })
        assert.throws(() => usecase(), /SESSION_SECRET.+must be set/)
      })
    }

    it('should refuse to start when the default value is configured', function () {
      const settingsRepository = new MapSettingsRepository()
      settingsRepository.set('REDIS_URL', 'redis://localhost:6379')
      settingsRepository.set('SESSION_SECRET', DEFAULT_SECRET)
      const usecase = GetSessionSecret({ settingsRepository, logger })
      assert.throws(() => usecase(), /must be set/)
    })
  })
})
