//
// Copyright 2023 Perforce Software
//
import { AssertionError } from 'node:assert'
import * as fs from 'node:fs'
import { assert } from 'chai'
import { before, describe, it } from 'mocha'
import { temporaryFile } from 'tempy'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'
import DeleteTempConfig from 'helix-auth-svc/lib/features/admin/domain/usecases/DeleteTempConfig.js'

describe('DeleteTempConfig use case', function () {
  const temporaryRepository = new MapSettingsRepository()
  let usecase

  before(function () {
    usecase = DeleteTempConfig({ temporaryRepository })
  })

  it('should raise an error for invalid input', async function () {
    assert.throws(() => DeleteTempConfig({ temporaryRepository: null }), AssertionError)
  })

  it('should write allowed, non-empty values to the repository', async function () {
    // arrange
    const secretFile = temporaryFile({ extension: 'txt' })
    fs.writeFileSync(secretFile, 'lioness')
    temporaryRepository.set('OIDC_CLIENT_SECRET_FILE', secretFile)
    temporaryRepository.set('NAME1', 'VALUE1')
    // act
    await usecase()
    // assert
    assert.isFalse(temporaryRepository.has('OIDC_CLIENT_SECRET_FILE'))
    assert.isFalse(temporaryRepository.has('OIDC_CLIENT_SECRET'))
    assert.isFalse(temporaryRepository.has('NAME1'))
    assert.isUndefined(fs.statSync(secretFile, { throwIfNoEntry: false }))
  })
})
