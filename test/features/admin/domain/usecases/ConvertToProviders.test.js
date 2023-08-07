//
// Copyright 2023 Perforce Software
//
import { assert } from 'chai'
import { describe, it } from 'mocha'
import ConvertToProviders from 'helix-auth-svc/lib/features/admin/domain/usecases/ConvertToProviders.js'

describe('ConvertToProviders use case', function () {
  const usecase = ConvertToProviders()

  it('should raise an error for invalid input', async function () {
    try {
      // act
      await usecase(null)
      assert.fail('should have raised error')
    } catch (err) {
      // assert
      assert.include(err.message, 'settings must be provided')
    }
  })

  it('should do nothing if no AUTH_PROVIDERS', async function () {
    // arrange
    const settings = new Map()
    settings.set('SAML_IDP_SLO_URL', 'https://saml/logout')
    // act
    await usecase(settings)
    // assert
    assert.isFalse(settings.has('AUTH_PROVIDERS'))
    assert.isTrue(settings.has('SAML_IDP_SLO_URL'))
    assert.equal(settings.get('SAML_IDP_SLO_URL'), 'https://saml/logout')
  })

  it('should remove classic settings if AUTH_PROVIDERS set', async function () {
    // arrange
    const settings = new Map()
    settings.set('OIDC_ISSUER_URI', 'https://oidc/issuer')
    settings.set('SAML_IDP_SLO_URL', 'https://saml/logout')
    const providers = [{
      label: 'Acme Identity',
      protocol: 'oidc',
      issuerUri: 'https://oidc.example.com',
      clientId: 'client-id',
      clientSecret: 'client-secret'
    }, {
      label: 'Example SAML',
      protocol: 'saml',
      metadataUrl: 'https://saml.example.com',
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
    assert.isFalse(settings.has('OIDC_ISSUER_URI'))
    assert.isFalse(settings.has('SAML_IDP_SLO_URL'))
  })

  it('should shadow classic settings if requested', async function () {
    // arrange
    const settings = new Map()
    settings.set('OIDC_ISSUER_URI', 'https://oidc/issuer')
    settings.set('SAML_IDP_SLO_URL', 'https://saml/logout')
    const providers = [{
      label: 'Acme Identity',
      protocol: 'oidc',
      issuerUri: 'https://oidc.example.com',
      clientId: 'client-id',
      clientSecret: 'client-secret'
    }, {
      label: 'Example SAML',
      protocol: 'saml',
      metadataUrl: 'https://saml2.example.com',
      spEntityId: 'urn:example2:sp',
      idpCert: '-----BEGIN CERTIFICATE-----'
    }]
    settings.set('AUTH_PROVIDERS', providers)
    // act
    await usecase(settings, { shadow: true })
    // assert
    assert.isDefined(settings.get('AUTH_PROVIDERS'))
    const actualProviders = settings.get('AUTH_PROVIDERS')
    assert.lengthOf(actualProviders, 2)
    assert.isTrue(settings.has('OIDC_ISSUER_URI'))
    assert.isTrue(settings.has('SAML_IDP_SLO_URL'))
    assert.isUndefined(settings.get('OIDC_ISSUER_URI'))
    assert.isUndefined(settings.get('SAML_IDP_SLO_URL'))
  })
})
