//
// Copyright 2023 Perforce Software
//
import { assert } from 'chai'
import { describe, it } from 'mocha'
import { EnvSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/EnvSettingsRepository.js'

describe('EnvSettingsRepository', function () {
  const sut = new EnvSettingsRepository()

  it('should return string or undefined from get()', function () {
    process.env['SETTING_VALUE'] = 'a_value'
    assert.equal(sut.get('SETTING_VALUE'), 'a_value')
    assert.isUndefined(sut.get('SETTING_UNDEFINED'))
  })

  it('should return true or false from has()', function () {
    process.env['SETTING_VALUE'] = 'a_value'
    assert.isTrue(sut.has('SETTING_VALUE'))
    assert.isFalse(sut.has('NO_SUCH_SETTING_BY_THAT_NAME'))
  })

  it('should return true or false from getBool()', function () {
    process.env['SETTING_TRUE'] = 'true'
    process.env['SETTING_NONE'] = 'none'
    process.env['SETTING_FALSE'] = 'false'
    assert.isTrue(sut.getBool('SETTING_TRUE'))
    assert.isFalse(sut.getBool('SETTING_NONE'))
    assert.isFalse(sut.getBool('SETTING_FALSE'))
    assert.isFalse(sut.getBool('SETTING_UNDEFINED'))
  })

  it('should return value or fallback from getInt()', function () {
    process.env['SETTING_3000'] = '3000'
    assert.equal(sut.getInt('SETTING_3000', 100), 3000)
    assert.equal(sut.getInt('SETTING_NONE', 101), 101)
  })

  it('should allow changing values', function () {
    sut.set('HAS_TEST_BOOL', 'true')
    assert.isTrue(sut.getBool('HAS_TEST_BOOL'))
    sut.set('HAS_TEST_INT', '123')
    assert.equal(sut.get('HAS_TEST_INT'), '123')
    sut.set('HAS_TEST_STR', 'abc')
    assert.equal(sut.get('HAS_TEST_STR'), 'abc')
  })
})
