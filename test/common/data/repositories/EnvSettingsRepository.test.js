//
// Copyright 2023 Perforce Software
//
import { assert } from 'chai'
import { describe, it } from 'mocha'
import { EnvSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/EnvSettingsRepository.js'

describe('EnvSettingsRepository', function () {
  const sut = new EnvSettingsRepository({ dotenvFile: 'test/dot.env' })

  it('should return string or undefined from get()', function () {
    process.env['ESR_SETTING_VALUE'] = 'a_value'
    assert.equal(sut.get('ESR_SETTING_VALUE'), 'a_value')
    assert.isUndefined(sut.get('ESR_SETTING_UNDEFINED'))
    assert.equal(sut.get('OAUTH_ISSUER'), 'http://jwt.doc:3000/')
  })

  it('should return true or false from has()', function () {
    process.env['ESR_SETTING_VALUE'] = 'a_value'
    assert.isTrue(sut.has('ESR_SETTING_VALUE'))
    assert.isFalse(sut.has('NO_SUCH_SETTING_BY_THAT_NAME'))
    assert.isTrue(sut.has('OAUTH_ISSUER'))
  })

  it('should return true or false from getBool()', function () {
    process.env['ESR_SETTING_TRUE'] = 'true'
    process.env['ESR_SETTING_NONE'] = 'none'
    process.env['ESR_SETTING_FALSE'] = 'false'
    assert.isTrue(sut.getBool('ESR_SETTING_TRUE'))
    assert.isFalse(sut.getBool('ESR_SETTING_NONE'))
    assert.isFalse(sut.getBool('ESR_SETTING_FALSE'))
    assert.isFalse(sut.getBool('ESR_SETTING_UNDEFINED'))
  })

  it('should return value or fallback from getInt()', function () {
    process.env['ESR_SETTING_3000'] = '3000'
    assert.equal(sut.getInt('ESR_SETTING_3000', 100), 3000)
    assert.equal(sut.getInt('ESR_SETTING_NONE', 101), 101)
  })

  it('should allow changing values', function () {
    sut.set('ESR_TEST_BOOL', 'true')
    assert.isTrue(sut.getBool('ESR_TEST_BOOL'))
    sut.set('ESR_TEST_INT', '123')
    assert.equal(sut.get('ESR_TEST_INT'), '123')
    sut.set('ESR_TEST_STR', 'abc')
    assert.equal(sut.get('ESR_TEST_STR'), 'abc')
  })

  it('should shadow values in process environment', function () {
    process.env['ESR_SETTING_VALUE'] = 'a_value'
    assert.equal(sut.get('ESR_SETTING_VALUE'), 'a_value')
    sut.set('ESR_SETTING_VALUE', 'new_value')
    assert.equal(sut.get('ESR_SETTING_VALUE'), 'new_value')
  })

  it('should discard changes when reloading from file', function () {
    sut.set('ESR_LOCAL_VALUE', 'new_value')
    sut.set('ESR_LOCAL_TRUE', 'true')
    sut.set('ESR_LOCAL_3000', '3000')
    sut.reload()
    assert.isFalse(sut.has('ESR_LOCAL_VALUE'))
    assert.isFalse(sut.has('ESR_LOCAL_TRUE'))
    assert.isFalse(sut.has('ESR_LOCAL_3000'))
  })
})
