//
// Copyright 2022 Perforce Software
//
import { AssertionError } from 'node:assert'
import * as fs from 'node:fs'
import { assert } from 'chai'
import { describe, it } from 'mocha'
import { temporaryFile } from 'tempy'
import RefreshEnvironment from 'helix-auth-svc/lib/common/domain/usecases/RefreshEnvironment.js'

describe('RefreshEnvironment use case', function () {
  it('should raise an error for invalid input', async function () {
    assert.throws(() => RefreshEnvironment({ dotenvFile: null }), AssertionError)
    try {
      const usecase = RefreshEnvironment({ dotenvFile: 'does/not/exist/.env' })
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
    const usecase = RefreshEnvironment({ dotenvFile })
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
