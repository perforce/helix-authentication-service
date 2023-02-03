//
// Copyright 2022 Perforce Software
//
import * as fs from 'node:fs'
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { describe, it } from 'mocha'
import { temporaryFile } from 'tempy'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'
import GetIdPConfiguration from 'helix-auth-svc/lib/features/login/domain/usecases/GetIdPConfiguration.js'

describe('GetIdPConfiguration use case', function () {
  it('should raise an error for invalid input', async function () {
    assert.throws(() => GetIdPConfiguration({ settingsRepository: null }), AssertionError)
  })

  it('should fail when loading a missing file', async function () {
    // arrange
    const settingsRepository = new MapSettingsRepository()
    settingsRepository.set('IDP_CONFIG_FILE', 'filedoesnot.exist')
    const usecase = GetIdPConfiguration({ settingsRepository })
    try {
      // act
      await usecase()
      assert.fail('should have raised error')
    } catch (err) {
      // assert
      assert.include(err.message, 'Cannot find package')
    }
  })

  it('should fail when loading a misnamed file', async function () {
    // arrange
    const settingsRepository = new MapSettingsRepository()
    settingsRepository.set('IDP_CONFIG_FILE', 'helix-auth-svc/test/dot.env')
    const usecase = GetIdPConfiguration({ settingsRepository })
    try {
      // act
      await usecase()
      assert.fail('should have raised error')
    } catch (err) {
      // assert
      assert.include(err.message, 'Unknown file extension')
    }
  })

  it('should fail when loading a malformed file', async function () {
    // arrange
    const notjavascript = temporaryFile({ extension: 'cjs' })
    fs.writeFileSync(notjavascript, 'this is not valid')
    const settingsRepository = new MapSettingsRepository()
    settingsRepository.set('IDP_CONFIG_FILE', notjavascript)
    const usecase = GetIdPConfiguration({ settingsRepository })
    try {
      // act
      await usecase()
      assert.fail('should have raised error')
    } catch (err) {
      // assert
      assert.include(err.message, 'Unexpected identifier')
    }
  })

  it('should succesfully load a valid file', async function () {
    // arrange
    const settingsRepository = new MapSettingsRepository()
    settingsRepository.set('IDP_CONFIG_FILE', 'helix-auth-svc/routes/saml_idp.conf.cjs')
    const usecase = GetIdPConfiguration({ settingsRepository })
    // act
    const result = await usecase()
    // assert
    assert.property(result, 'urn:swarm-example:sp')
  })

  it('should succesfully load from a relative path', async function () {
    // arrange
    const settingsRepository = new MapSettingsRepository()
    settingsRepository.set('IDP_CONFIG_FILE', './routes/saml_idp.conf.cjs')
    const usecase = GetIdPConfiguration({ settingsRepository })
    // act
    const result = await usecase()
    // assert
    assert.property(result, 'urn:swarm-example:sp')
  })

  it('should succesfully load CommonJS with .js extension', async function () {
    // arrange
    const commonjs = temporaryFile({ extension: 'js' })
    fs.writeFileSync(commonjs, `// comment line
module.exports = {
  // comment line
  'urn:swarm-example:sp': {
    acsUrl: 'http://swarm.example.com/api/v10/session'
  }
}`)
    const settingsRepository = new MapSettingsRepository()
    settingsRepository.set('IDP_CONFIG_FILE', commonjs)
    const usecase = GetIdPConfiguration({ settingsRepository })
    // act
    const result = await usecase()
    // assert
    assert.property(result, 'urn:swarm-example:sp')
  })
})
