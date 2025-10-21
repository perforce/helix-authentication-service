//
// Copyright 2025 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { before, beforeEach, describe, it } from 'mocha'
import { DefaultsEnvRepository } from 'helix-auth-svc/lib/common/data/repositories/DefaultsEnvRepository.js'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'
import { MergedSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MergedSettingsRepository.js'
import ValidateAuthProvider from 'helix-auth-svc/lib/features/admin/domain/usecases/ValidateAuthProvider.js'
import FetchSamlMetadata from 'helix-auth-svc/lib/features/login/domain/usecases/FetchSamlMetadata.js'
import GenerateFormAction from 'helix-auth-svc/lib/features/login/domain/usecases/GenerateFormAction.js'
import GetAuthProviders from 'helix-auth-svc/lib/features/login/domain/usecases/GetAuthProviders.js'
import GetSamlAuthnContext from 'helix-auth-svc/lib/features/login/domain/usecases/GetSamlAuthnContext.js'
import GetSamlConfiguration from 'helix-auth-svc/lib/features/login/domain/usecases/GetSamlConfiguration.js'
import TidyAuthProviders from 'helix-auth-svc/lib/features/login/domain/usecases/TidyAuthProviders.js'

describe('GenerateFormAction use case', function () {
  const temporaryRepository = new MapSettingsRepository()
  // cannot actually write to process.env, use map instead
  const configuredRepository = new MapSettingsRepository()
  const defaultsRepository = new DefaultsEnvRepository()
  // construct a realistic repository so GetAuthProviders works properly
  const settingsRepository = new MergedSettingsRepository({
    temporaryRepository,
    configuredRepository,
    defaultsRepository
  })
  const getSamlAuthnContext = GetSamlAuthnContext({ settingsRepository })
  let usecase

  before(function () {
    const tidyAuthProviders = TidyAuthProviders({
      getSamlAuthnContext: GetSamlAuthnContext(),
      validateAuthProvider: ValidateAuthProvider()
    })
    const getAuthProviders = GetAuthProviders({ defaultsRepository, settingsRepository, tidyAuthProviders })
    const fetchSamlMetadata = FetchSamlMetadata()
    const getSamlConfiguration = GetSamlConfiguration({
      fetchSamlMetadata,
      getSamlAuthnContext,
      getAuthProviders
    })
    usecase = GenerateFormAction({ getAuthProviders, getSamlConfiguration })
  })

  beforeEach(function () {
    temporaryRepository.clear()
  })

  it('should raise an error for invalid input', async function () {
    assert.throws(() => GenerateFormAction({
      getAuthProviders: null,
      getSamlConfiguration: {}
    }), AssertionError)
    assert.throws(() => GenerateFormAction({
      getAuthProviders: {},
      getSamlConfiguration: null
    }), AssertionError)
  })

  it('should return "self" when no providers configured', async function () {
    // arrange
    // act
    const result = await usecase()
    // assert
    assert.lengthOf(result, 1)
    assert.equal(result[0], "'self'")
  })

  it('should return SAML SSO URL from settings', async function () {
    // arrange
    const providers = [{
      label: 'Acme Identity',
      signonUrl: 'https://saml.example.com/login',
      idpCert: `-----BEGIN CERTIFICATE-----
MIIErDCCApQCCQCVmh2sP3DTFTANBgkqhkiG9w0BAQsFADAYMRYwFAYDVQQDDA1G
o/mqlYGsRE1PiIpwZ6gYLcQGeelJb3HNB4pHde5DHURNjPlEBMZOGhd+w6fLWNSP
-----END CERTIFICATE-----`,
      protocol: 'saml'
    }]
    temporaryRepository.set('AUTH_PROVIDERS', providers)
    // act
    const result = await usecase()
    // assert
    assert.lengthOf(result, 2)
    assert.equal(result[0], "'self'")
    assert.equal(result[1], "https://saml.example.com")
  })

  it('should read SAML SSO URL from metadata', async function () {
    // arrange
    const providers = [{
      id: 'saml',
      label: 'Shibboleth',
      protocol: 'saml',
      metadataFile: 'test/fixtures/idp-metadata.xml',
      nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified',
      authnContext: 'urn:oasis:names:tc:SAML:2.0:ac:classes:Password'
    }]
    temporaryRepository.set('AUTH_PROVIDERS', providers)
    // act
    const result = await usecase()
    // assert
    assert.lengthOf(result, 2)
    assert.equal(result[0], "'self'")
    assert.equal(result[1], 'https://shibboleth.doc:4443')
  })

  it('should return OIDC issuer URI from settings', async function () {
    // arrange
    const providers = [{
      label: 'Veritas Solutions',
      issuerUri: 'https://oidc.example.com',
      clientId: 'client-id',
      clientSecret: 'client-secret',
      protocol: 'oidc'
    }]
    temporaryRepository.set('AUTH_PROVIDERS', providers)
    // act
    const result = await usecase()
    // assert
    assert.lengthOf(result, 2)
    assert.equal(result[0], "'self'")
    assert.equal(result[1], 'https://oidc.example.com')
  })

  it('should return a URL for each provider', async function () {
    // arrange
    const providers = [{
      label: 'Acme Identity',
      signonUrl: 'https://saml.example.com/login',
      idpCert: `-----BEGIN CERTIFICATE-----
MIIErDCCApQCCQCVmh2sP3DTFTANBgkqhkiG9w0BAQsFADAYMRYwFAYDVQQDDA1G
o/mqlYGsRE1PiIpwZ6gYLcQGeelJb3HNB4pHde5DHURNjPlEBMZOGhd+w6fLWNSP
-----END CERTIFICATE-----`,
      protocol: 'saml'
    }, {
      label: 'Veritas Solutions',
      issuerUri: 'https://oidc.example.com',
      clientId: 'client-id',
      clientSecret: 'client-secret',
      protocol: 'oidc'
    }, {
      id: 'saml',
      label: 'Shibboleth',
      protocol: 'saml',
      metadataFile: 'test/fixtures/idp-metadata.xml',
      nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified',
      authnContext: 'urn:oasis:names:tc:SAML:2.0:ac:classes:Password'
    }]
    temporaryRepository.set('AUTH_PROVIDERS', providers)
    // act
    const result = await usecase()
    // assert
    assert.lengthOf(result, 4)
    assert.equal(result[0], "'self'")
    // order changes according to protocol with saml before oidc
    assert.equal(result[1], "https://saml.example.com")
    assert.equal(result[2], 'https://shibboleth.doc:4443')
    assert.equal(result[3], 'https://oidc.example.com')
  })
})
