//
// Copyright 2023 Perforce Software
//
import { assert } from 'chai'
import { describe, it } from 'mocha'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'

describe('MapSettingsRepository', function () {
  it('should return string or undefined from get()', function () {
    const sut = new MapSettingsRepository()
    sut.set('SETTING_VALUE', 'a_value')
    assert.equal(sut.get('SETTING_VALUE'), 'a_value')
    assert.isUndefined(sut.get('SETTING_UNDEFINED'))
  })

  it('should return true or false from has()', function () {
    const sut = new MapSettingsRepository()
    sut.set('SETTING_VALUE', 'a_value')
    assert.isTrue(sut.has('SETTING_VALUE'))
    assert.isFalse(sut.has('NO_SUCH_SETTING_BY_THAT_NAME'))
  })

  it('should return true or false from getBool()', function () {
    const sut = new MapSettingsRepository()
    sut.set('SETTING_TRUE', 'true')
    sut.set('SETTING_NONE', 'none')
    sut.set('SETTING_FALSE', 'false')
    assert.isTrue(sut.getBool('SETTING_TRUE'))
    assert.isFalse(sut.getBool('SETTING_NONE'))
    assert.isFalse(sut.getBool('SETTING_FALSE'))
    assert.isFalse(sut.getBool('SETTING_UNDEFINED'))
  })

  it('should return value or fallback from getInt()', function () {
    const sut = new MapSettingsRepository()
    sut.set('SETTING_3000', '3000')
    sut.set('SETTING_NONE', 'none')
    assert.equal(sut.getInt('SETTING_3000', 100), 3000)
    assert.equal(sut.getInt('SETTING_NONE', 101), 101)
  })

  it('should allow changing values', function () {
    const sut = new MapSettingsRepository()
    sut.set('HAS_TEST_BOOL', 'true')
    assert.isTrue(sut.getBool('HAS_TEST_BOOL'))
    sut.set('HAS_TEST_INT', '123')
    assert.equal(sut.get('HAS_TEST_INT'), '123')
    sut.set('HAS_TEST_STR', 'abc')
    assert.equal(sut.get('HAS_TEST_STR'), 'abc')
  })
})
