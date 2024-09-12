//
// Copyright 2022 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { describe, it } from 'mocha'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'
import LoadAuthorityCerts from 'helix-auth-svc/lib/common/domain/usecases/LoadAuthorityCerts.js'

describe('LoadAuthorityCerts use case', function () {
  it('should raise an error for invalid input', function () {
    assert.throws(() => LoadAuthorityCerts({ settingsRepository: null }), AssertionError)
  })

  it('should return undefined when missing file', function () {
    // arrange
    const settingsRepository = new MapSettingsRepository()
    settingsRepository.set('CA_CERT_FILE', 'filedoesnot.exist')
    const usecase = LoadAuthorityCerts({ settingsRepository })
    // act
    const result = usecase()
    // assert
    assert.isUndefined(result)
  })

  it('should succesfully load a single file', function () {
    // arrange
    const settingsRepository = new MapSettingsRepository()
    settingsRepository.set('CA_CERT_FILE', './certs/ca.crt')
    const usecase = LoadAuthorityCerts({ settingsRepository })
    // act
    const result = usecase()
    // assert
    assert.isDefined(result)
    assert.lengthOf(result, 1)
    assert.instanceOf(result[0], Buffer)
  })

  it('should succesfully load a single file via glob', function () {
    // arrange
    const settingsRepository = new MapSettingsRepository()
    settingsRepository.set('CA_CERT_FILE', './certs/c?.crt')
    const usecase = LoadAuthorityCerts({ settingsRepository })
    // act
    const result = usecase()
    // assert
    assert.isDefined(result)
    assert.lengthOf(result, 1)
    assert.instanceOf(result[0], Buffer)
  })

  it('should succesfully load multiple files via glob', function () {
    // arrange
    const settingsRepository = new MapSettingsRepository()
    settingsRepository.set('CA_CERT_FILE', './certs/*.crt')
    const usecase = LoadAuthorityCerts({ settingsRepository })
    // act
    const result = usecase()
    // assert
    assert.isDefined(result)
    assert.lengthOf(result, 3)
    assert.instanceOf(result[0], Buffer)
    assert.instanceOf(result[1], Buffer)
  })

  it('should succesfully load multiple files from path', function () {
    // arrange
    const settingsRepository = new MapSettingsRepository()
    settingsRepository.set('CA_CERT_PATH', './certs')
    const usecase = LoadAuthorityCerts({ settingsRepository })
    // act
    const result = usecase()
    // assert
    assert.isDefined(result)
    assert.lengthOf(result, 10)
    assert.instanceOf(result[0], Buffer)
    assert.instanceOf(result[6], Buffer)
  })
})
