//
// Copyright 2023 Perforce Software
//
import { assert } from 'chai'
import { describe, it } from 'mocha'
import { DefaultsEnvRepository } from 'helix-auth-svc/lib/common/data/repositories/DefaultsEnvRepository.js'

describe('DefaultsEnvRepository', function () {
  const sut = new DefaultsEnvRepository()

  it('should raise an error when calling set()', function () {
    assert.throws(() => sut.set('foo', 'bar'), Error)
  })

  it('should return all available entries', function () {
    const result = Object.fromEntries(sut.entries())
    assert.equal(Object.keys(result).length, 24)
    assert.property(result, 'ADMIN_USERNAME')
    assert.property(result, 'OIDC_TOKEN_SIGNING_ALGO')
    assert.property(result, 'TOKEN_TTL')
  })

  it('should return string or undefined from get()', function () {
    assert.equal(sut.get('ADMIN_USERNAME'), 'perforce')
    assert.isUndefined(sut.get('NO_SUCH_SETTING'))
  })

  it('should return true or false from has()', function () {
    assert.isTrue(sut.has('OIDC_SELECT_ACCOUNT'))
    assert.isFalse(sut.has('NO_SUCH_SETTING'))
  })

  it('should return true or false from getBool()', function () {
    // there are currently no `true` defaults
    // assert.isTrue(sut.getBool('SETTING_TRUE'))
    assert.isFalse(sut.getBool('OIDC_SELECT_ACCOUNT'))
    assert.isFalse(sut.getBool('INSTANCE_ID'))
    assert.isFalse(sut.getBool('TOKEN_TTL'))
  })

  it('should return value or fallback from getInt()', function () {
    assert.equal(sut.getInt('CACHE_TTL', 101), 300)
    assert.equal(sut.getInt('LOGIN_TIMEOUT', 101), 60)
    assert.equal(sut.getInt('TOKEN_TTL', 101), 3600)
    assert.equal(sut.getInt('INSTANCE_ID', 101), 101)
  })

  it('should return expected values for all default settings', function () {
    // verify every default setting
    assert.equal(sut.get('ADMIN_USERNAME'), 'perforce')
    assert.equal(sut.get('ALLOW_USER_RENAME'), 'false')
    assert.equal(sut.get('BEARER_TOKEN'), 'keyboard cat')
    assert.equal(sut.get('CACHE_TTL'), '300')
    assert.isTrue(sut.has('CERT_FILE'))
    assert.include(sut.get('IDP_CONFIG'), 'urn:swarm-example:sp')
    assert.isFalse(sut.has('IDP_CONFIG_FILE'))
    assert.equal(sut.get('INSTANCE_ID'), 'none')
    assert.isTrue(sut.has('KEY_FILE'))
    assert.equal(sut.get('LOGIN_TIMEOUT'), '60')
    assert.equal(sut.get('OIDC_SELECT_ACCOUNT'), 'false')
    assert.equal(sut.get('OIDC_TOKEN_SIGNING_ALGO'), 'RS256')
    assert.isTrue(sut.has('REDIS_CERT_FILE'))
    assert.isTrue(sut.has('REDIS_KEY_FILE'))
    assert.equal(sut.get('SAML_AUTHN_CONTEXT'), 'urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport')
    assert.equal(sut.get('SAML_DISABLE_CONTEXT'), 'false')
    assert.equal(sut.get('SAML_FORCE_AUTHN'), 'false')
    assert.equal(sut.get('SAML_NAMEID_FORMAT'), 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified')
    assert.equal(sut.get('SAML_SP_ENTITY_ID'), 'https://has.example.com')
    assert.equal(sut.get('SAML_WANT_ASSERTION_SIGNED'), 'true')
    assert.equal(sut.get('SAML_WANT_RESPONSE_SIGNED'), 'true')
    assert.equal(sut.get('SESSION_SECRET'), 'keyboard cat')
    assert.equal(sut.get('SP_KEY_ALGO'), 'sha256')
    assert.equal(sut.get('STATUS_ENABLED'), 'true')
    assert.equal(sut.get('TOKEN_TTL'), '3600')
  })
})
