//
// Copyright 2023 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { describe, it } from 'mocha'
import ConvertFromProviders from 'helix-auth-svc/lib/features/admin/domain/usecases/ConvertFromProviders.js'

describe('ConvertFromProviders use case', function () {
  const usecase = ConvertFromProviders()

  it('should raise an error for invalid input', async function () {
    assert.throws(() => usecase(null), AssertionError)
  })

  it('should convert auth providers to original settings', async function () {
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

  it('should do nothing if more than two auth providers', async function () {
    // arrange
    const settings = new Map()
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
    assert.isDefined(settings.get('SAML_IDP_SLO_URL'))
    assert.isUndefined(settings.get('IDP_CERT'))
    assert.isUndefined(settings.get('SAML_IDP_METADATA_URL'))
    assert.isUndefined(settings.get('SAML_INFO_LABEL'))
    assert.isUndefined(settings.get('SAML_SP_ENTITY_ID'))
  })
})
