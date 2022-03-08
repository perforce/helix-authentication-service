//
// Copyright 2022 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { before, beforeEach, describe, it } from 'mocha'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'
import GetSamlAuthnContext from 'helix-auth-svc/lib/features/login/domain/usecases/GetSamlAuthnContext.js'

describe('GetSamlAuthnContext use case', function () {
  const settings = new Map()
  let usecase

  before(function () {
    const settingsRepository = new MapSettingsRepository(settings)
    usecase = GetSamlAuthnContext({ settingsRepository })
  })

  beforeEach(function () {
    settings.clear()
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

  it('should return the plain string value if not a list', function () {
    // arrange
    settings.set('SAML_AUTHN_CONTEXT', 'urn:oasis:names:tc:SAML:2.0:ac:classes:Password')
    // act
    const result = usecase()
    // assert
    assert.isDefined(result)
    assert.equal(result, 'urn:oasis:names:tc:SAML:2.0:ac:classes:Password')
  })

  it('should return a list if multiple values inside brackets', function () {
    // arrange
    settings.set('SAML_AUTHN_CONTEXT', `"[ ' urn:oasis:names:tc:SAML:2.0:ac:classes:Kerberos', 'urn:oasis:names:tc:SAML:2.0:ac:classes:Password' ]"`)
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
    settings.set('SAML_AUTHN_CONTEXT', `"['urn:oasis:names:tc:SAML:2.0:ac:classes:Kerberos,'urn:oasis:names:tc:SAML:2.0:ac:classes:Password']`)
    // act
    const result = usecase()
    // assert
    assert.isDefined(result)
    assert.lengthOf(result, 2)
    assert.equal(result[0], 'urn:oasis:names:tc:SAML:2.0:ac:classes:Kerberos')
    assert.equal(result[1], 'urn:oasis:names:tc:SAML:2.0:ac:classes:Password')
  })
})
