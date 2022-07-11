//
// Copyright 2022 Perforce Software
//
import { AssertionError } from 'node:assert'
import * as fs from 'node:fs'
import { assert } from 'chai'
import { before, beforeEach, describe, it } from 'mocha'
import { temporaryFile } from 'tempy'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'
import RefreshEnvironment from 'helix-auth-svc/lib/common/domain/usecases/RefreshEnvironment.js'

describe('RefreshEnvironment use case', function () {
  const settings = new Map()
  let usecase

  before(function () {
    const settingsRepository = new MapSettingsRepository(settings)
    usecase = RefreshEnvironment({ settingsRepository })
  })

  beforeEach(function () {
    settings.clear()
  })

  it('should raise an error for invalid input', async function () {
    assert.throws(() => RefreshEnvironment({ settingsRepository: null }), AssertionError)
    try {
      usecase(null)
      assert.fail('should have raised error')
    } catch (err) {
      assert.instanceOf(err, AssertionError)
    }
    settings.set('DOTENV_FILE', 'does/not/exist/.env')
    try {
      await usecase({})
    } catch (err) {
      assert.include(err.code, 'ENOENT')
    }
  })

  it('should set values, update values, and remove values', async function () {
    const dotenvFile = temporaryFile({ extension: 'env' })
    const env = {}
    // see the new setting
    fs.writeFileSync(dotenvFile, `# comment line
HAS_TEST_NAME=initialValue
`)
    settings.set('DOTENV_FILE', dotenvFile)
    const result1 = await usecase(env)
    assert.property(result1, 'HAS_TEST_NAME')
    assert.equal(env['HAS_TEST_NAME'], 'initialValue')
    // process new value for existing setting
    fs.writeFileSync(dotenvFile, `# comment line
HAS_TEST_NAME=newValue
`)
    const result2 = await usecase(env)
    assert.property(result2, 'HAS_TEST_NAME')
    assert.equal(env['HAS_TEST_NAME'], 'newValue')
    // remove the setting
    fs.writeFileSync(dotenvFile, `# comment line
# no settings here
`)
    const result3 = await usecase(env)
    assert.notProperty(result3, 'HAS_TEST_NAME')
    assert.isUndefined(env['HAS_TEST_NAME'])
  })
})
