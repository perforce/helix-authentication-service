//
// Copyright 2022 Perforce Software
//
import { assert } from 'chai'
import { describe, it } from 'mocha'
import { EnvSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/EnvSettingsRepository.js'

describe('EnvSettingsRepository', function () {
  it('should return string or undefined from get()', function () {
    process.env['SETTING_VALUE'] = 'a_value'
    const sut = new EnvSettingsRepository()
    assert.equal(sut.get('SETTING_VALUE'), 'a_value')
    assert.isUndefined(sut.get('SETTING_UNDEFINED'))
  })

  it('should return true or false from getBool()', function () {
    process.env['SETTING_TRUE'] = 'true'
    process.env['SETTING_NONE'] = 'none'
    process.env['SETTING_FALSE'] = 'false'
    const sut = new EnvSettingsRepository()
    assert.isTrue(sut.getBool('SETTING_TRUE'))
    assert.isFalse(sut.getBool('SETTING_NONE'))
    assert.isFalse(sut.getBool('SETTING_FALSE'))
    assert.isFalse(sut.getBool('SETTING_UNDEFINED'))
  })
})
