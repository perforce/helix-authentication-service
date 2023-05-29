//
// Copyright 2023 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { describe, it } from 'mocha'
import ConvertFromProviders from 'helix-auth-svc/lib/features/admin/domain/usecases/ConvertFromProviders.js'
import ValidateAuthProvider from 'helix-auth-svc/lib/features/admin/domain/usecases/ValidateAuthProvider.js'
import TidyAuthProviders from 'helix-auth-svc/lib/features/login/domain/usecases/TidyAuthProviders.js'

describe('ConvertFromProviders use case', function () {
  const usecase = ConvertFromProviders({
    tidyAuthProviders: TidyAuthProviders(),
    validateAuthProvider: ValidateAuthProvider(),
 })

  it('should raise an error for invalid input', async function () {
    assert.throws(() => ConvertFromProviders({ tidyAuthProviders: null, validateAuthProvider: {} }), AssertionError)
    assert.throws(() => ConvertFromProviders({ tidyAuthProviders: {}, validateAuthProvider: null }), AssertionError)
    try {
      // act
      await usecase(null)
      assert.fail('should have raised error')
    } catch (err) {
      // assert
      assert.include(err.message, 'settings must be provided')
    }
  })

  it('should overwrite classic with 1 auth provider', async function () {
    // arrange
    const settings = new Map()
    settings.set('SAML_IDP_SLO_URL', 'https://saml/logout')
    const providers = [{
      label: 'Acme Identity',
      protocol: 'saml',
      metadataUrl: 'https://saml.example.com',
      spEntityId: 'urn:example:sp',
      idpCert: '-----BEGIN CERTIFICATE-----'
    }]
    settings.set('AUTH_PROVIDERS', providers)
    // act
    await usecase(settings)
    // assert
    assert.isUndefined(settings.get('AUTH_PROVIDERS'))
    assert.isUndefined(settings.get('SAML_IDP_SLO_URL'))
    assert.equal(settings.get('IDP_CERT'), '-----BEGIN CERTIFICATE-----')
    assert.equal(settings.get('SAML_IDP_METADATA_URL'), 'https://saml.example.com')
    assert.equal(settings.get('SAML_INFO_LABEL'), 'Acme Identity')
    assert.equal(settings.get('SAML_SP_ENTITY_ID'), 'urn:example:sp')
  })

  it('should remove classic settings if 2 saml providers', async function () {
    // arrange
    const settings = new Map()
    settings.set('OIDC_ISSUER_URI', 'https://oidc/issuer')
    settings.set('SAML_IDP_SLO_URL', 'https://saml/logout')
    const providers = [{
      label: 'Acme Identity',
      protocol: 'saml',
      metadataUrl: 'https://saml.example.com',
      spEntityId: 'urn:example:sp',
      idpCert: '-----BEGIN CERTIFICATE-----'
    }, {
      label: 'Example SAML',
      protocol: 'saml',
      metadataUrl: 'https://saml2.example.com',
      spEntityId: 'urn:example2:sp',
      idpCert: '-----BEGIN CERTIFICATE-----'
    }]
    settings.set('AUTH_PROVIDERS', providers)
    // act
    await usecase(settings)
    // assert
    assert.isDefined(settings.get('AUTH_PROVIDERS'))
    const actualProviders = settings.get('AUTH_PROVIDERS')
    assert.lengthOf(actualProviders, 2)
    assert.isTrue(actualProviders.every((e) => e.protocol === 'saml'))
    assert.isUndefined(settings.get('OIDC_ISSUER_URI'))
    assert.isUndefined(settings.get('SAML_IDP_SLO_URL'))
  })

  it('should remove everything if 0 auth providers', async function () {
    // arrange
    const settings = new Map()
    settings.set('OIDC_ISSUER_URI', 'https://oidc/issuer')
    settings.set('SAML_IDP_SLO_URL', 'https://saml/logout')
    settings.set('AUTH_PROVIDERS', [])
    // act
    await usecase(settings)
    // assert
    assert.isUndefined(settings.get('AUTH_PROVIDERS'))
    assert.isUndefined(settings.get('OIDC_ISSUER_URI'))
    assert.isUndefined(settings.get('SAML_IDP_SLO_URL'))
  })

  it('should have classic and auth providers if 1 oidc and 2 saml', async function () {
    // arrange
    const settings = new Map()
    settings.set('OIDC_ISSUER_URI', 'https://oidc/issuer')
    settings.set('OIDC_CLIENT_ID', 'client-id')
    settings.set('OIDC_CLIENT_SECRET', 'client-secret')
    settings.set('SAML_IDP_SLO_URL', 'https://saml/logout')
    const providers = [{
      // bogus provider that results from reading defaults
      selectAccount: true,
      signingAlgo: "RS256",
      protocol: "oidc"
    },
    {
      label: 'One Identity',
      protocol: 'oidc',
      issuerUri: 'https://oidc.example.com',
      clientId: 'updated-id',
      clientSecret: 'updated-secret'
    }, {
      label: 'Acme Identity',
      protocol: 'saml',
      metadataUrl: 'https://saml.example.com',
      spEntityId: 'urn:example:sp',
      idpCert: '-----BEGIN CERTIFICATE-----'
    }, {
      label: 'Example SAML',
      protocol: 'saml',
      metadataUrl: 'https://saml2.example.com',
      spEntityId: 'urn:example2:sp',
      idpCert: '-----BEGIN CERTIFICATE-----'
    }]
    settings.set('AUTH_PROVIDERS', providers)
    // act
    await usecase(settings)
    // assert
    assert.isDefined(settings.get('AUTH_PROVIDERS'))
    const actualProviders = settings.get('AUTH_PROVIDERS')
    assert.lengthOf(actualProviders, 2)
    assert.isTrue(actualProviders.every((e) => e.protocol === 'saml'))
    assert.equal(settings.get('OIDC_ISSUER_URI'), 'https://oidc.example.com')
    assert.equal(settings.get('OIDC_CLIENT_ID'), 'updated-id')
    assert.equal(settings.get('OIDC_CLIENT_SECRET'), 'updated-secret')
    assert.isUndefined(settings.get('SAML_IDP_SLO_URL'))
  })
})
