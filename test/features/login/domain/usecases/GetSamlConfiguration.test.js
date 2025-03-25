//
// Copyright 2023 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { before, beforeEach, describe, it } from 'mocha'
import mute from 'mute'
import { DefaultsEnvRepository } from 'helix-auth-svc/lib/common/data/repositories/DefaultsEnvRepository.js'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'
import ValidateAuthProvider from 'helix-auth-svc/lib/features/admin/domain/usecases/ValidateAuthProvider.js'
import FetchSamlMetadata from 'helix-auth-svc/lib/features/login/domain/usecases/FetchSamlMetadata.js'
import GetAuthProviders from 'helix-auth-svc/lib/features/login/domain/usecases/GetAuthProviders.js'
import GetSamlAuthnContext from 'helix-auth-svc/lib/features/login/domain/usecases/GetSamlAuthnContext.js'
import GetSamlConfiguration from 'helix-auth-svc/lib/features/login/domain/usecases/GetSamlConfiguration.js'
import TidyAuthProviders from 'helix-auth-svc/lib/features/login/domain/usecases/TidyAuthProviders.js'

describe('GetSamlConfiguration use case', function () {
  const defaultsRepository = new DefaultsEnvRepository()
  const settingsRepository = new MapSettingsRepository()
  const getSamlAuthnContext = GetSamlAuthnContext({ settingsRepository })
  const tidyAuthProviders = TidyAuthProviders({
    getSamlAuthnContext,
    validateAuthProvider: ValidateAuthProvider()
  })
  let usecase

  before(function () {
    const fetchSamlMetadata = FetchSamlMetadata()
    const getAuthProviders = GetAuthProviders({ defaultsRepository, settingsRepository, tidyAuthProviders })
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
    settingsRepository.set('AUTH_PROVIDERS', [])
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
    settingsRepository.set('AUTH_PROVIDERS', [{
      label: 'Acme Identity',
      protocol: 'saml',
      signonUrl: 'https://example.com/saml/sso'
    }])
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
    settingsRepository.set('SAML_FORCE_AUTHN', '1')
    settingsRepository.set('SAML_IDP_METADATA_FILE', 'test/fixtures/idp-metadata.xml')
    settingsRepository.set('SAML_WANT_ASSERTION_SIGNED', 'false')
    settingsRepository.set('SAML_WANT_RESPONSE_SIGNED', 'TRUE')
    settingsRepository.set('SAML_DISABLE_CONTEXT', undefined)
    // act
    const result = await usecase()
    // assert
    assert.equal(result.entryPoint, 'https://shibboleth.doc:4443/idp/profile/SAML2/Redirect/SSO')
    assert.isTrue(result.forceAuthn)
    assert.isUndefined(result.disableRequestedAuthnContext)
    assert.isFalse(result.wantAssertionsSigned)
    assert.isTrue(result.wantAuthnResponseSigned)
    assert.isUndefined(result.audience)
  })

  it('should inject sensible defaults for minimal provider', async function () {
    // arrange
    settingsRepository.set('AUTH_PROVIDERS', [{
      id: 'shibbo123',
      idpEntityId: 'urn:saml.example.com',
      signonUrl: 'https://saml.example.com/saml/sso',
      idpCert: `-----BEGIN CERTIFICATE-----
MIIErDCCApQCCQCVmh2sP3DTFTANBgkqhkiG9w0BAQsFADAYMRYwFAYDVQQDDA1G
o/mqlYGsRE1PiIpwZ6gYLcQGeelJb3HNB4pHde5DHURNjPlEBMZOGhd+w6fLWNSP
-----END CERTIFICATE-----`
    }])
    // act
    const result = await usecase('shibbo123')
    // assert
    assert.equal(result.entryPoint, 'https://saml.example.com/saml/sso')
    assert.equal(result.issuer, 'https://has.example.com')
    assert.equal(result.idpIssuer, 'urn:saml.example.com')
    assert.isFalse(result.forceAuthn)
    assert.isFalse(result.disableRequestedAuthnContext, false)
    assert.equal(result.signatureAlgorithm, 'sha256')
    assert.equal(result.identifierFormat, 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified')
    assert.isFalse(result.disableRequestedAuthnContext)
    assert.isTrue(result.wantAssertionsSigned)
    assert.isTrue(result.wantAuthnResponseSigned)
    assert.isUndefined(result.audience)
    assert.equal(result.authnContext[0], 'urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport')
  })

  it('should interpret truthy values from provider', async function () {
    // arrange
    settingsRepository.set('AUTH_PROVIDERS', [{
      id: 'shibbo123',
      label: 'Shibboleth',
      protocol: 'saml',
      metadataFile: 'test/fixtures/idp-metadata.xml',
      disableContext: undefined,
      forceAuthn: 1,
      wantAssertionSigned: 'false',
      wantResponseSigned: 'TRUE'
    }])
    // act
    const result = await usecase('shibbo123')
    // assert
    assert.equal(result.entryPoint, 'https://shibboleth.doc:4443/idp/profile/SAML2/Redirect/SSO')
    assert.isTrue(result.forceAuthn)
    assert.isFalse(result.disableRequestedAuthnContext)
    assert.isFalse(result.wantAssertionsSigned)
    assert.isTrue(result.wantAuthnResponseSigned)
    assert.isUndefined(result.audience)
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
      assert.isUndefined(result.wantAssertionsSigned)
      assert.isUndefined(result.wantAuthnResponseSigned)
    }
  })

  it('should fetch metadata via URL with provider', async function () {
    if (process.env.UNIT_ONLY) {
      this.skip()
    } else {
      // arrange
      settingsRepository.set('AUTH_PROVIDERS', [{
        id: 'shibbo123',
        label: 'Shibboleth',
        protocol: 'saml',
        metadataUrl: 'https://shibboleth.doc:4443/idp/shibboleth',
        nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified',
        authnContext: 'urn:oasis:names:tc:SAML:2.0:ac:classes:Password',
        forceAuthn: false
      }])
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
      assert.isTrue(result.wantAssertionsSigned)
      assert.isTrue(result.wantAuthnResponseSigned)
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
    settingsRepository.set('AUTH_PROVIDERS', [{
      id: 'shibbo123',
      label: 'Shibboleth',
      protocol: 'saml',
      metadataFile: 'test/fixtures/idp-metadata.xml',
      nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified',
      authnContext: 'urn:oasis:names:tc:SAML:2.0:ac:classes:Password'
    }])
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
    assert.include(result.idpCert, 'MIIEoTCCAokCAQEwDQYJKoZIhvcNAQELBQAwGDEWMBQGA1UEAwwNRmFrZUF1dGhv')
    assert.notInclude(result.idpCert, '-BEGIN CERTIFICATE-')
    assert.notInclude(result.idpCert, '-END CERTIFICATE-')
  })

  it('should read IdP cert file via provider', async function () {
    // arrange
    settingsRepository.set('AUTH_PROVIDERS', [{
      id: 'shibbo123',
      label: 'Acme Identity',
      protocol: 'saml',
      signonUrl: 'https://example.com/saml/sso',
      idpCertFile: 'certs/server.crt'
    }])
    // act
    const result = await usecase('shibbo123')
    // assert
    assert.equal(result.entryPoint, 'https://example.com/saml/sso')
    assert.include(result.idpCert, 'MIIEoTCCAokCAQEwDQYJKoZIhvcNAQELBQAwGDEWMBQGA1UEAwwNRmFrZUF1dGhv')
    assert.notInclude(result.idpCert, '-BEGIN CERTIFICATE-')
    assert.notInclude(result.idpCert, '-END CERTIFICATE-')
  })
})
