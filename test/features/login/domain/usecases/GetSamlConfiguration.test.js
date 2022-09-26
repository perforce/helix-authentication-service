//
// Copyright 2022 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { before, beforeEach, describe, it } from 'mocha'
import mute from 'mute'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'
import FetchSamlMetadata from 'helix-auth-svc/lib/features/login/domain/usecases/FetchSamlMetadata.js'
import GetAuthProviders from 'helix-auth-svc/lib/features/login/domain/usecases/GetAuthProviders.js'
import GetSamlAuthnContext from 'helix-auth-svc/lib/features/login/domain/usecases/GetSamlAuthnContext.js'
import GetSamlConfiguration from 'helix-auth-svc/lib/features/login/domain/usecases/GetSamlConfiguration.js'

describe('GetSamlConfiguration use case', function () {
  const settings = new Map()
  let usecase

  before(function () {
    const settingsRepository = new MapSettingsRepository(settings)
    const fetchSamlMetadata = FetchSamlMetadata()
    const getSamlAuthnContext = GetSamlAuthnContext({ settingsRepository })
    const getAuthProviders = GetAuthProviders({ settingsRepository })
    usecase = GetSamlConfiguration({
      settingsRepository,
      fetchSamlMetadata,
      getSamlAuthnContext,
      getAuthProviders
    })
  })

  beforeEach(function () {
    settings.clear()
  })

  it('should raise an error for invalid input', async function () {
    assert.throws(() => GetSamlConfiguration({
      settingsRepository: null,
      fetchSamlMetadata: {},
      getSamlAuthnContext: {},
      getAuthProviders: {}
    }), AssertionError)
    assert.throws(() => GetSamlConfiguration({
      settingsRepository: {},
      fetchSamlMetadata: null,
      getSamlAuthnContext: {},
      getAuthProviders: {}
    }), AssertionError)
    assert.throws(() => GetSamlConfiguration({
      settingsRepository: {},
      fetchSamlMetadata: {},
      getSamlAuthnContext: null,
      getAuthProviders: {}
    }), AssertionError)
    assert.throws(() => GetSamlConfiguration({
      settingsRepository: {},
      fetchSamlMetadata: {},
      getSamlAuthnContext: {},
      getAuthProviders: null
    }), AssertionError)
  })

  it('should raise error when no providers configured', async function () {
    // arrange
    const providers = { providers: [] }
    settings.set('AUTH_PROVIDERS', JSON.stringify(providers))
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
    settings.set('AUTH_PROVIDERS', JSON.stringify(providers))
    // act
    try {
      await usecase('oidc-10')
      assert.fail('should have raised error')
    } catch (err) {
      assert.include(err.message, 'no such provider')
    }
  })

  it('should return basic config with minimal settings', async function () {
    // arrange
    settings.set('SAML_IDP_SSO_URL', 'https://example.com/saml/sso')
    // act
    const result = await usecase()
    // assert
    assert.equal(result.entryPoint, 'https://example.com/saml/sso')
  })

  it('should fetch metadata via URL with settings', async function () {
    // arrange
    settings.set('SAML_AUTHN_CONTEXT', 'urn:oasis:names:tc:SAML:2.0:ac:classes:Password')
    settings.set('SAML_IDP_METADATA_URL', 'https://shibboleth.doc:4443/idp/shibboleth')
    settings.set('SAML_NAMEID_FORMAT', 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified')
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
  })

  it('should fetch metadata via URL with provider', async function () {
    // arrange
    const providers = {
      providers: [{
        label: 'Shibboleth',
        protocol: 'saml',
        metadataUrl: 'https://shibboleth.doc:4443/idp/shibboleth',
        nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified',
        authnContext: 'urn:oasis:names:tc:SAML:2.0:ac:classes:Password',
        forceAuthn: false
      }]
    }
    settings.set('AUTH_PROVIDERS', JSON.stringify(providers))
    // act
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0
    // mute the warning from node about disabling TLS validation
    const unmute = mute(process.stderr)
    const result = await usecase('saml-0')
    unmute()
    delete process.env.NODE_TLS_REJECT_UNAUTHORIZED
    // assert
    assert.equal(result.entryPoint, 'https://shibboleth.doc:4443/idp/profile/SAML2/Redirect/SSO')
    assert.equal(result.identifierFormat, 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified')
    assert.equal(result.authnContext, 'urn:oasis:names:tc:SAML:2.0:ac:classes:Password')
    assert.isFalse(result.forceAuthn)
  })

  it('should fetch metadata via file with settings', async function () {
    // arrange
    settings.set('SAML_AUTHN_CONTEXT', 'urn:oasis:names:tc:SAML:2.0:ac:classes:Password')
    settings.set('SAML_IDP_METADATA_FILE', 'containers/shibboleth/shibboleth-idp/metadata/idp-metadata.xml')
    settings.set('SAML_NAMEID_FORMAT', 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified')
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
  })

  it('should fetch metadata via file with provider', async function () {
    // arrange
    const providers = {
      providers: [{
        label: 'Shibboleth',
        protocol: 'saml',
        metadataFile: 'containers/shibboleth/shibboleth-idp/metadata/idp-metadata.xml',
        nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified',
        authnContext: 'urn:oasis:names:tc:SAML:2.0:ac:classes:Password'
      }]
    }
    settings.set('AUTH_PROVIDERS', JSON.stringify(providers))
    // act
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0
    // mute the warning from node about disabling TLS validation
    const unmute = mute(process.stderr)
    const result = await usecase('saml-0')
    unmute()
    delete process.env.NODE_TLS_REJECT_UNAUTHORIZED
    // assert
    assert.equal(result.entryPoint, 'https://shibboleth.doc:4443/idp/profile/SAML2/Redirect/SSO')
    assert.equal(result.identifierFormat, 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified')
    assert.equal(result.authnContext, 'urn:oasis:names:tc:SAML:2.0:ac:classes:Password')
  })

  it('should read IdP cert file via settings', async function () {
    // arrange
    settings.set('IDP_CERT_FILE', 'certs/server.crt')
    settings.set('SAML_IDP_SSO_URL', 'https://example.com/saml/sso')
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
        label: 'Acme Identity',
        protocol: 'saml',
        signonUrl: 'https://example.com/saml/sso',
        idpCertFile: 'certs/server.crt'
      }]
    }
    settings.set('AUTH_PROVIDERS', JSON.stringify(providers))
    // act
    const result = await usecase('saml-0')
    // assert
    assert.equal(result.entryPoint, 'https://example.com/saml/sso')
    assert.include(result.cert, 'MIIEoTCCAokCAQEwDQYJKoZIhvcNAQELBQAwGDEWMBQGA1UEAwwNRmFrZUF1dGhv')
    assert.notInclude(result.cert, '-BEGIN CERTIFICATE-')
    assert.notInclude(result.cert, '-END CERTIFICATE-')
  })
})
