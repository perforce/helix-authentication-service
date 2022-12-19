//
// Copyright 2022 Perforce Software
//
import { AssertionError } from 'node:assert'
import * as fs from 'node:fs'
import { assert } from 'chai'
import { describe, it } from 'mocha'
import { temporaryFile } from 'tempy'
import LoadEnvironment from 'helix-auth-svc/lib/common/domain/usecases/LoadEnvironment.js'

describe('LoadEnvironment use case', function () {
  it('should raise an error for invalid input', async function () {
    assert.throws(() => LoadEnvironment({ dotenvFile: null }), AssertionError)
    try {
      const usecase = LoadEnvironment({ dotenvFile: 'does/not/exist/.env' })
      await usecase({})
    } catch (err) {
      assert.include(err.code, 'ENOENT')
    }
  })

  it('should read values from configuration', async function () {
    const dotenvFile = temporaryFile({ extension: 'env' })
    fs.writeFileSync(dotenvFile, `HAS_TEST_NAME=initialValue`)
    const usecase = LoadEnvironment({ dotenvFile })
    const env = await usecase()
    assert.property(env, 'HAS_TEST_NAME')
    assert.equal(env['HAS_TEST_NAME'], 'initialValue')
  })
})
