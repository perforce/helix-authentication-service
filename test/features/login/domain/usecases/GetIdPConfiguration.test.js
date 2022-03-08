//
// Copyright 2022 Perforce Software
//
import * as fs from 'node:fs'
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { describe, it } from 'mocha'
import tempy from 'tempy'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'
import GetIdPConfiguration from 'helix-auth-svc/lib/features/login/domain/usecases/GetIdPConfiguration.js'

describe('GetIdPConfiguration use case', function () {
  it('should raise an error for invalid input', async function () {
    assert.throws(() => GetIdPConfiguration({ settingsRepository: null }), AssertionError)
  })

  it('should fail when loading a missing file', async function () {
    // arrange
    const map = new Map()
    map.set('IDP_CONFIG_FILE', 'filedoesnot.exist')
    const settingsRepository = new MapSettingsRepository(map)
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
    const map = new Map()
    map.set('IDP_CONFIG_FILE', 'helix-auth-svc/test/dot.env')
    const settingsRepository = new MapSettingsRepository(map)
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
    const notjavascript = tempy.file({ extension: 'cjs' })
    fs.writeFileSync(notjavascript, 'this is not valid')
    const map = new Map()
    map.set('IDP_CONFIG_FILE', notjavascript)
    const settingsRepository = new MapSettingsRepository(map)
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
    const map = new Map()
    map.set('IDP_CONFIG_FILE', 'helix-auth-svc/routes/saml_idp.conf.cjs')
    const settingsRepository = new MapSettingsRepository(map)
    const usecase = GetIdPConfiguration({ settingsRepository })
    // act
    const result = await usecase()
    // assert
    assert.property(result, 'urn:swarm-example:sp')
  })
})
