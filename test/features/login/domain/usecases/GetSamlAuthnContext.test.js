//
// Copyright 2023 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { before, beforeEach, describe, it } from 'mocha'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'
import GetSamlAuthnContext from 'helix-auth-svc/lib/features/login/domain/usecases/GetSamlAuthnContext.js'

describe('GetSamlAuthnContext use case', function () {
  const settingsRepository = new MapSettingsRepository()
  let usecase

  before(function () {
    usecase = GetSamlAuthnContext({ settingsRepository })
  })

  beforeEach(function () {
    settingsRepository.clear()
  })

  it('should raise an error for invalid input', function () {
    assert.throws(() => GetSamlAuthnContext({ settingsRepository: null }), AssertionError)
  })

  it('should return undefined if SAML_AUTHN_CONTEXT not set', function () {
    // act
    const result = usecase()
    // assert
    assert.isUndefined(result)
  })

  it('should prefer passed parameter value over configuration', function () {
    // arrange
    settingsRepository.set('SAML_AUTHN_CONTEXT', 'urn:oasis:names:tc:SAML:2.0:ac:classes:Password')
    // act
    const result = usecase('urn:oasis:names:tc:SAML:2.0:ac:classes:Kerberos')
    // assert
    assert.isDefined(result)
    assert.lengthOf(result, 1)
    assert.equal(result[0], 'urn:oasis:names:tc:SAML:2.0:ac:classes:Kerberos')
  })

  it('should return a singleton list even with plain string', function () {
    // arrange
    settingsRepository.set('SAML_AUTHN_CONTEXT', 'urn:oasis:names:tc:SAML:2.0:ac:classes:Password')
    // act
    const result = usecase()
    // assert
    assert.isDefined(result)
    assert.lengthOf(result, 1)
    assert.equal(result[0], 'urn:oasis:names:tc:SAML:2.0:ac:classes:Password')
  })

  it('should return a list if multiple values inside brackets', function () {
    // arrange
    settingsRepository.set('SAML_AUTHN_CONTEXT', `"[ ' urn:oasis:names:tc:SAML:2.0:ac:classes:Kerberos', 'urn:oasis:names:tc:SAML:2.0:ac:classes:Password' ]"`)
    // act
    const result = usecase()
    // assert
    assert.isDefined(result)
    assert.lengthOf(result, 2)
    assert.equal(result[0], 'urn:oasis:names:tc:SAML:2.0:ac:classes:Kerberos')
    assert.equal(result[1], 'urn:oasis:names:tc:SAML:2.0:ac:classes:Password')
  })

  it('should leave an array value as-is', function () {
    // arrange
    settingsRepository.set('SAML_AUTHN_CONTEXT', [
      'urn:oasis:names:tc:SAML:2.0:ac:classes:Kerberos',
      'urn:oasis:names:tc:SAML:2.0:ac:classes:Password'
    ])
    // act
    const result = usecase()
    // assert
    assert.isDefined(result)
    assert.lengthOf(result, 2)
    assert.equal(result[0], 'urn:oasis:names:tc:SAML:2.0:ac:classes:Kerberos')
    assert.equal(result[1], 'urn:oasis:names:tc:SAML:2.0:ac:classes:Password')
  })

  it('should ignore empty list entries', function () {
    // arrange
    settingsRepository.set('SAML_AUTHN_CONTEXT', `"[urn:oasis:names:tc:SAML:2.0:ac:classes:Kerberos,,'urn:oasis:names:tc:SAML:2.0:ac:classes:Password',]"`)
    // act
    const result = usecase()
    // assert
    assert.isDefined(result)
    assert.lengthOf(result, 2)
    assert.equal(result[0], 'urn:oasis:names:tc:SAML:2.0:ac:classes:Kerberos')
    assert.equal(result[1], 'urn:oasis:names:tc:SAML:2.0:ac:classes:Password')
  })

  it('should trim mismatched quotes and brackets from list entries', function () {
    // arrange
    settingsRepository.set('SAML_AUTHN_CONTEXT', `"['urn:oasis:names:tc:SAML:2.0:ac:classes:Kerberos,'urn:oasis:names:tc:SAML:2.0:ac:classes:Password']`)
    // act
    const result = usecase()
    // assert
    assert.isDefined(result)
    assert.lengthOf(result, 2)
    assert.equal(result[0], 'urn:oasis:names:tc:SAML:2.0:ac:classes:Kerberos')
    assert.equal(result[1], 'urn:oasis:names:tc:SAML:2.0:ac:classes:Password')
  })
})
