//
// Copyright 2023 Perforce Software
//
import { assert } from 'chai'
import { describe, it } from 'mocha'
import { DefaultsEnvRepository } from 'helix-auth-svc/lib/common/data/repositories/DefaultsEnvRepository.js'
import { EnvSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/EnvSettingsRepository.js'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'
import { MergedSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MergedSettingsRepository.js'

describe('MergedSettingsRepository', function () {
  const temporary = new MapSettingsRepository()
  const processEnv = new EnvSettingsRepository()
  const defaults = new DefaultsEnvRepository()
  const sut = new MergedSettingsRepository({
    temporaryRepository: temporary,
    processEnvRepository: processEnv,
    defaultsRepository: defaults
  })

  it('should return string or undefined from get()', function () {
    temporary.set('FROM_TEMP', 'temp_value')
    process.env['FROM_PROC'] = 'proc_value'
    assert.equal(sut.get('FROM_PROC'), 'proc_value')
    assert.equal(sut.get('FROM_TEMP'), 'temp_value')
    assert.equal(sut.get('SESSION_SECRET'), 'keyboard cat')
    assert.isUndefined(sut.get('SETTING_UNDEFINED'))
  })

  it('should return true or false from has()', function () {
    temporary.set('FROM_TEMP', 'temp_value')
    process.env['FROM_PROC'] = 'proc_value'
    assert.isTrue(sut.has('FROM_PROC'))
    assert.isTrue(sut.has('FROM_TEMP'))
    assert.isTrue(sut.has('OIDC_SELECT_ACCOUNT'))
    assert.isFalse(sut.has('SETTING_UNDEFINED'))
  })

  it('should return true or false from getBool()', function () {
    process.env['SETTING_TRUE'] = 'true'
    process.env['SETTING_TRUE_UPPER'] = 'TRUE'
    process.env['SETTING_NONE'] = 'none'
    process.env['SETTING_FALSE'] = 'false'
    assert.isTrue(sut.getBool('SETTING_TRUE'))
    assert.isTrue(sut.getBool('SETTING_TRUE_UPPER'))
    assert.isFalse(sut.getBool('SETTING_NONE'))
    assert.isFalse(sut.getBool('SETTING_FALSE'))
    assert.isFalse(sut.getBool('SETTING_UNDEFINED'))
    assert.isFalse(sut.getBool('OIDC_SELECT_ACCOUNT'))
  })

  it('should return value or fallback from getInt()', function () {
    process.env['SETTING_3000'] = '3000'
    assert.equal(sut.getInt('SETTING_3000', 100), 3000)
    assert.equal(sut.getInt('SETTING_NONE', 101), 101)
  })

  it('should allow shadowing via tempoary', function () {
    temporary.set('SHADOW_NAME', 'temp_value')
    process.env['SHADOW_NAME'] = 'proc_value'
    assert.equal(sut.get('SHADOW_NAME'), 'temp_value')
  })

  it('should write changes to procossEnv repo', function () {
    sut.set('HAS_TEST_BOOL', 'true')
    assert.isTrue(sut.getBool('HAS_TEST_BOOL'))
    sut.set('HAS_TEST_INT', '123')
    assert.equal(sut.get('HAS_TEST_INT'), '123')
    sut.set('HAS_TEST_STR', 'abc')
    assert.equal(sut.get('HAS_TEST_STR'), 'abc')
    // assert that the value did not go into the temporary repo
    assert.isFalse(temporary.has('HAS_TEST_BOOL'))
    assert.isFalse(temporary.has('HAS_TEST_INT'))
    assert.isFalse(temporary.has('HAS_TEST_STR'))
    // assert that the value was saved to the process repo
    assert.isTrue(processEnv.has('HAS_TEST_BOOL'))
    assert.isTrue(processEnv.has('HAS_TEST_INT'))
    assert.isTrue(processEnv.has('HAS_TEST_STR'))
    // no need to assert with defaults, it is not writable
  })
})
