//
// Copyright 2022 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { before, beforeEach, describe, it } from 'mocha'
import mute from 'mute'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'
import ValidateAuthProvider from 'helix-auth-svc/lib/features/admin/domain/usecases/ValidateAuthProvider.js'
import FetchSamlMetadata from 'helix-auth-svc/lib/features/login/domain/usecases/FetchSamlMetadata.js'
import GetAuthProviders from 'helix-auth-svc/lib/features/login/domain/usecases/GetAuthProviders.js'
import GetSamlAuthnContext from 'helix-auth-svc/lib/features/login/domain/usecases/GetSamlAuthnContext.js'
import GetSamlConfiguration from 'helix-auth-svc/lib/features/login/domain/usecases/GetSamlConfiguration.js'
import TidyAuthProviders from 'helix-auth-svc/lib/features/login/domain/usecases/TidyAuthProviders.js'

describe('GetSamlConfiguration use case', function () {
  const settingsRepository = new MapSettingsRepository()
  const tidyAuthProviders = TidyAuthProviders({ validateAuthProvider: ValidateAuthProvider() })
  let usecase

  before(function () {
    const fetchSamlMetadata = FetchSamlMetadata()
    const getSamlAuthnContext = GetSamlAuthnContext({ settingsRepository })
    const getAuthProviders = GetAuthProviders({ settingsRepository, tidyAuthProviders })
    usecase = GetSamlConfiguration({
      fetchSamlMetadata,
      getSamlAuthnContext,
      getAuthProviders
    })
  })

  beforeEach(function () {
    settingsRepository.clear()
  })

  it('should raise an error for invalid input', async function () {
    assert.throws(() => GetSamlConfiguration({
      fetchSamlMetadata: null,
      getSamlAuthnContext: {},
      getAuthProviders: {}
    }), AssertionError)
    assert.throws(() => GetSamlConfiguration({
      fetchSamlMetadata: {},
      getSamlAuthnContext: null,
      getAuthProviders: {}
    }), AssertionError)
    assert.throws(() => GetSamlConfiguration({
      fetchSamlMetadata: {},
      getSamlAuthnContext: {},
      getAuthProviders: null
    }), AssertionError)
  })

  it('should raise error when no providers configured', async function () {
    // arrange
    const providers = { providers: [] }
    settingsRepository.set('AUTH_PROVIDERS', JSON.stringify(providers))
    // act
    try {
      await usecase('saml-0')
      assert.fail('should have raised error')
    } catch (err) {
      assert.include(err.message, 'no such provider')
    }
  })

  it('should raise error when provider not found', async function () {
    // arrange
    const providers = {
      providers: [{
        label: 'Acme Identity',
        protocol: 'saml',
        signonUrl: 'https://example.com/saml/sso'
      }]
    }
    settingsRepository.set('AUTH_PROVIDERS', JSON.stringify(providers))
    // act
    try {
      await usecase('oidc-10')
      assert.fail('should have raised error')
    } catch (err) {
      assert.include(err.message, 'no such provider')
    }
  })

  it('should raise error when missing idp cert', async function () {
    // arrange
    settingsRepository.set('SAML_IDP_SSO_URL', 'https://example.com/saml/sso')
    try {
      // act
      await usecase()
      assert.fail('should have raised error')
    } catch (err) {
      // assert
      assert.include(err.message, 'certificate is required')
    }
  })

  it('should interpret truthy values from settings', async function () {
    // arrange
    settingsRepository.set('SAML_IDP_METADATA_FILE', 'test/fixtures/idp-metadata.xml')
    settingsRepository.set('SAML_WANT_ASSERTION_SIGNED', 'false')
    settingsRepository.set('SAML_WANT_RESPONSE_SIGNED', 'TRUE')
    settingsRepository.set('SAML_DISABLE_CONTEXT', undefined)
    // act
    const result = await usecase()
    // assert
    assert.equal(result.entryPoint, 'https://shibboleth.doc:4443/idp/profile/SAML2/Redirect/SSO')
    assert.isFalse(result.wantAssertionsSigned)
    assert.isTrue(result.wantAuthnResponseSigned)
  })

  it('should interpret truthy values from provider', async function () {
    // arrange
    const providers = {
      providers: [{
        id: 'shibbo123',
        label: 'Shibboleth',
        protocol: 'saml',
        metadataFile: 'test/fixtures/idp-metadata.xml',
        wantAssertionSigned: 'false',
        wantResponseSigned: 'TRUE'
      }]
    }
    settingsRepository.set('AUTH_PROVIDERS', JSON.stringify(providers))
    // act
    const result = await usecase('shibbo123')
    // assert
    assert.equal(result.entryPoint, 'https://shibboleth.doc:4443/idp/profile/SAML2/Redirect/SSO')
    assert.isFalse(result.wantAssertionsSigned)
    assert.isTrue(result.wantAuthnResponseSigned)
  })

  it('should fetch metadata via URL with settings', async function () {
    if (process.env.UNIT_ONLY) {
      this.skip()
    } else {
      // arrange
      settingsRepository.set('SAML_AUTHN_CONTEXT', 'urn:oasis:names:tc:SAML:2.0:ac:classes:Password')
      settingsRepository.set('SAML_IDP_METADATA_URL', 'https://shibboleth.doc:4443/idp/shibboleth')
      settingsRepository.set('SAML_NAMEID_FORMAT', 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified')
      // act
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0
      // mute the warning from node about disabling TLS validation
      const unmute = mute(process.stderr)
      const result = await usecase()
      unmute()
      delete process.env.NODE_TLS_REJECT_UNAUTHORIZED
      // assert
      assert.equal(result.entryPoint, 'https://shibboleth.doc:4443/idp/profile/SAML2/Redirect/SSO')
      assert.equal(result.identifierFormat, 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified')
      assert.equal(result.authnContext, 'urn:oasis:names:tc:SAML:2.0:ac:classes:Password')
      assert.isFalse(result.wantAssertionsSigned)
      assert.isFalse(result.wantAuthnResponseSigned)
    }
  })

  it('should fetch metadata via URL with provider', async function () {
    if (process.env.UNIT_ONLY) {
      this.skip()
    } else {
      // arrange
      const providers = {
        providers: [{
          id: 'shibbo123',
          label: 'Shibboleth',
          protocol: 'saml',
          metadataUrl: 'https://shibboleth.doc:4443/idp/shibboleth',
          nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified',
          authnContext: 'urn:oasis:names:tc:SAML:2.0:ac:classes:Password',
          forceAuthn: false
        }]
      }
      settingsRepository.set('AUTH_PROVIDERS', JSON.stringify(providers))
      // act
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0
      // mute the warning from node about disabling TLS validation
      const unmute = mute(process.stderr)
      const result = await usecase('shibbo123')
      unmute()
      delete process.env.NODE_TLS_REJECT_UNAUTHORIZED
      // assert
      assert.equal(result.entryPoint, 'https://shibboleth.doc:4443/idp/profile/SAML2/Redirect/SSO')
      assert.equal(result.identifierFormat, 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified')
      assert.equal(result.authnContext, 'urn:oasis:names:tc:SAML:2.0:ac:classes:Password')
      assert.isFalse(result.forceAuthn)
      assert.isUndefined(result.wantAssertionsSigned)
      assert.isUndefined(result.wantAuthnResponseSigned)
    }
  })

  it('should fetch metadata via file with settings', async function () {
    // arrange
    settingsRepository.set('SAML_AUTHN_CONTEXT', 'urn:oasis:names:tc:SAML:2.0:ac:classes:Password')
    settingsRepository.set('SAML_IDP_METADATA_FILE', 'test/fixtures/idp-metadata.xml')
    settingsRepository.set('SAML_NAMEID_FORMAT', 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified')
    // act
    const result = await usecase()
    // assert
    assert.equal(result.entryPoint, 'https://shibboleth.doc:4443/idp/profile/SAML2/Redirect/SSO')
    assert.equal(result.identifierFormat, 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified')
    assert.equal(result.authnContext, 'urn:oasis:names:tc:SAML:2.0:ac:classes:Password')
  })

  it('should fetch metadata via file with provider', async function () {
    // arrange
    const providers = {
      providers: [{
        id: 'shibbo123',
        label: 'Shibboleth',
        protocol: 'saml',
        metadataFile: 'test/fixtures/idp-metadata.xml',
        nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified',
        authnContext: 'urn:oasis:names:tc:SAML:2.0:ac:classes:Password'
      }]
    }
    settingsRepository.set('AUTH_PROVIDERS', JSON.stringify(providers))
    // act
    const result = await usecase('shibbo123')
    // assert
    assert.equal(result.entryPoint, 'https://shibboleth.doc:4443/idp/profile/SAML2/Redirect/SSO')
    assert.equal(result.identifierFormat, 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified')
    assert.equal(result.authnContext, 'urn:oasis:names:tc:SAML:2.0:ac:classes:Password')
  })

  it('should read IdP cert file via settings', async function () {
    // arrange
    settingsRepository.set('IDP_CERT_FILE', 'certs/server.crt')
    settingsRepository.set('SAML_IDP_SSO_URL', 'https://example.com/saml/sso')
    // act
    const result = await usecase()
    // assert
    assert.equal(result.entryPoint, 'https://example.com/saml/sso')
    assert.include(result.cert, 'MIIEoTCCAokCAQEwDQYJKoZIhvcNAQELBQAwGDEWMBQGA1UEAwwNRmFrZUF1dGhv')
    assert.notInclude(result.cert, '-BEGIN CERTIFICATE-')
    assert.notInclude(result.cert, '-END CERTIFICATE-')
  })

  it('should read IdP cert file via provider', async function () {
    // arrange
    const providers = {
      providers: [{
        id: 'shibbo123',
        label: 'Acme Identity',
        protocol: 'saml',
        signonUrl: 'https://example.com/saml/sso',
        idpCertFile: 'certs/server.crt'
      }]
    }
    settingsRepository.set('AUTH_PROVIDERS', JSON.stringify(providers))
    // act
    const result = await usecase('shibbo123')
    // assert
    assert.equal(result.entryPoint, 'https://example.com/saml/sso')
    assert.include(result.cert, 'MIIEoTCCAokCAQEwDQYJKoZIhvcNAQELBQAwGDEWMBQGA1UEAwwNRmFrZUF1dGhv')
    assert.notInclude(result.cert, '-BEGIN CERTIFICATE-')
    assert.notInclude(result.cert, '-END CERTIFICATE-')
  })
})
