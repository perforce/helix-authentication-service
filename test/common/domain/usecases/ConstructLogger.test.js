//
// Copyright 2023 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { beforeEach, describe, it } from 'mocha'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'
import ConstructLogger from 'helix-auth-svc/lib/common/domain/usecases/ConstructLogger.js'

describe('ConstructLogger use case', function () {
  const settingsRepository = new MapSettingsRepository()

  beforeEach(function () {
    settingsRepository.clear()
  })

  it('should raise an error for invalid input', function () {
    assert.throws(() => ConstructLogger({ settingsRepository: null }), AssertionError)
  })

  it('should successfully construct a default logger', async function () {
    const sut = ConstructLogger({ settingsRepository })
    const logger = await sut()
    assert.isDefined(logger)
    assert.equal(logger.level, 'info')
    assert.isFalse(logger.exitOnError)
  })

  it('should successfully construct a "none" logger', async function () {
    settingsRepository.set('LOGGING', 'none')
    const sut = ConstructLogger({ settingsRepository })
    const logger = await sut()
    assert.isDefined(logger)
    assert.equal(logger.level, 'error')
    assert.isFalse(logger.exitOnError)
  })

  it('should successfully construct a "DEBUG" logger', async function () {
    settingsRepository.set('DEBUG', 'true')
    const sut = ConstructLogger({ settingsRepository })
    const logger = await sut()
    assert.isDefined(logger)
    assert.equal(logger.level, 'debug')
    assert.isFalse(logger.exitOnError)
  })

  it('should successfully construct a file/warn logger from text', async function () {
    settingsRepository.set('LOGGING', `// commment
module.exports = {
  level: 'warn',
  transport: 'file',
  file: {
    filename: 'auth-svc.log',
    maxsize: 1048576,
    maxfiles: 4
  }
}
`)
    const sut = ConstructLogger({ settingsRepository })
    const logger = await sut()
    assert.isDefined(logger)
    assert.equal(logger.level, 'warn')
    assert.isFalse(logger.exitOnError)
  })

  it('should successfully construct a file/warn logger from object', async function () {
    settingsRepository.set('LOGGING', {
      level: 'warn',
      transport: 'file',
      file: {
        filename: 'auth-svc.log',
        maxsize: 1048576,
        maxfiles: 4
      }
    })
    const sut = ConstructLogger({ settingsRepository })
    const logger = await sut()
    assert.isDefined(logger)
    assert.equal(logger.level, 'warn')
    assert.isFalse(logger.exitOnError)
  })
})
