//
// Copyright 2023 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { describe, it } from 'mocha'
import ConvertFromProviders from 'helix-auth-svc/lib/features/admin/domain/usecases/ConvertFromProviders.js'
import ValidateAuthProvider from 'helix-auth-svc/lib/features/admin/domain/usecases/ValidateAuthProvider.js'
import GetSamlAuthnContext from 'helix-auth-svc/lib/features/login/domain/usecases/GetSamlAuthnContext.js'
import TidyAuthProviders from 'helix-auth-svc/lib/features/login/domain/usecases/TidyAuthProviders.js'

describe('ConvertFromProviders use case', function () {
  const usecase = ConvertFromProviders({
    tidyAuthProviders: TidyAuthProviders({
      getSamlAuthnContext: GetSamlAuthnContext(),
      validateAuthProvider: ValidateAuthProvider()
    })
  })

  it('should raise an error for invalid input', async function () {
    assert.throws(() => ConvertFromProviders({ tidyAuthProviders: null }), AssertionError)
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
    assert.lengthOf(settings, 4)
    assert.isFalse(settings.has('AUTH_PROVIDERS'))
    assert.isFalse(settings.has('SAML_IDP_SLO_URL'))
    assert.equal(settings.get('IDP_CERT'), '-----BEGIN CERTIFICATE-----')
    assert.equal(settings.get('SAML_IDP_METADATA_URL'), 'https://saml.example.com')
    assert.equal(settings.get('SAML_INFO_LABEL'), 'Acme Identity')
    assert.equal(settings.get('SAML_SP_ENTITY_ID'), 'urn:example:sp')
  })

  it('should convert authnContext list to a string', async function () {
    // arrange
    const contexts = [
      'urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport',
      'urn:oasis:names:tc:SAML:2.0:ac:classes:Kerberos',
      'urn:oasis:names:tc:SAML:2.0:ac:classes:Password'
    ]
    const authnContext = '[' + contexts.map((e) => `"${e}"`).join() + ']'
    const settings = new Map()
    const providers = [{
      label: 'Acme Identity',
      protocol: 'saml',
      metadataUrl: 'https://saml.example.com',
      authnContext: contexts
    }]
    settings.set('AUTH_PROVIDERS', providers)
    // act
    await usecase(settings)
    // assert
    assert.lengthOf(settings, 3)
    assert.isFalse(settings.has('AUTH_PROVIDERS'))
    assert.equal(settings.get('SAML_IDP_METADATA_URL'), 'https://saml.example.com')
    assert.equal(settings.get('SAML_INFO_LABEL'), 'Acme Identity')
    assert.equal(settings.get('SAML_AUTHN_CONTEXT'), authnContext)
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
    assert.lengthOf(settings, 1)
    assert.isDefined(settings.get('AUTH_PROVIDERS'))
    const actualProviders = settings.get('AUTH_PROVIDERS')
    assert.lengthOf(actualProviders, 2)
    assert.isTrue(actualProviders.every((e) => e.protocol === 'saml'))
    assert.isFalse(settings.has('OIDC_ISSUER_URI'))
    assert.isFalse(settings.has('SAML_IDP_SLO_URL'))
  })

  it('should shadow classic settings if 2 saml providers', async function () {
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
    await usecase(settings, { shadow: true })
    // assert
    assert.lengthOf(settings, 28)
    assert.isDefined(settings.get('AUTH_PROVIDERS'))
    const actualProviders = settings.get('AUTH_PROVIDERS')
    assert.lengthOf(actualProviders, 2)
    assert.isTrue(actualProviders.every((e) => e.protocol === 'saml'))
    const undefinedSettings = [
      'IDP_CERT_FILE',
      'IDP_CERT',
      'OIDC_CLIENT_ID',
      'OIDC_CLIENT_SECRET_FILE',
      'OIDC_CLIENT_SECRET',
      'OIDC_CODE_CHALLENGE_METHOD',
      'OIDC_INFO_LABEL',
      'OIDC_ISSUER_URI',
      'OIDC_MAX_AGE',
      'OIDC_SELECT_ACCOUNT',
      'OIDC_TOKEN_SIGNING_ALGO',
      'SAML_AUTHN_CONTEXT',
      'SAML_DISABLE_CONTEXT',
      'SAML_FORCE_AUTHN',
      'SAML_IDP_ENTITY_ID',
      'SAML_IDP_METADATA_FILE',
      'SAML_IDP_METADATA_URL',
      'SAML_IDP_METADATA',
      'SAML_IDP_SLO_URL',
      'SAML_IDP_SSO_URL',
      'SAML_INFO_LABEL',
      'SAML_NAMEID_FORMAT',
      'SAML_SP_AUDIENCE',
      'SAML_SP_ENTITY_ID',
      'SAML_WANT_ASSERTION_SIGNED',
      'SAML_WANT_RESPONSE_SIGNED',
      'SP_KEY_ALGO'
    ]
    for (const settingName of undefinedSettings) {
      assert.isTrue(settings.has(settingName), `isTrue ${settingName}`)
      assert.isUndefined(settings.get(settingName), `isUndefined ${settingName}`)
    }
  })

  it('should ignore default providers if 2 saml providers', async function () {
    // arrange
    const settings = new Map()
    settings.set('OIDC_SELECT_ACCOUNT', false)
    settings.set('OIDC_TOKEN_SIGNING_ALGO', 'RS256')
    settings.set('SAML_AUTHN_CONTEXT', 'urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport')
    settings.set('SAML_NAMEID_FORMAT', 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified')
    settings.set('SAML_SP_ENTITY_ID', 'https://has.example.com')
    settings.set('SAML_WANT_ASSERTION_SIGNED', true)
    settings.set('SAML_WANT_RESPONSE_SIGNED', true)
    settings.set('SP_KEY_ALGO', 'sha256')
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
    assert.lengthOf(settings, 1)
    assert.isDefined(settings.get('AUTH_PROVIDERS'))
    const actualProviders = settings.get('AUTH_PROVIDERS')
    assert.lengthOf(actualProviders, 2)
    assert.isTrue(actualProviders.every((e) => e.protocol === 'saml'))
    assert.isFalse(settings.has('OIDC_ISSUER_URI'))
    assert.isFalse(settings.has('SAML_IDP_SLO_URL'))
    assert.isFalse(settings.has('OIDC_SELECT_ACCOUNT'))
    assert.isFalse(settings.has('OIDC_TOKEN_SIGNING_ALGO'))
    assert.isFalse(settings.has('SAML_AUTHN_CONTEXT'))
    assert.isFalse(settings.has('SAML_NAMEID_FORMAT'))
    assert.isFalse(settings.has('SAML_SP_ENTITY_ID'))
    assert.isFalse(settings.has('SAML_WANT_ASSERTION_SIGNED'))
    assert.isFalse(settings.has('SAML_WANT_RESPONSE_SIGNED'))
    assert.isFalse(settings.has('SP_KEY_ALGO'))
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
    assert.lengthOf(settings, 0)
    assert.isFalse(settings.has('AUTH_PROVIDERS'))
    assert.isFalse(settings.has('OIDC_ISSUER_URI'))
    assert.isFalse(settings.has('SAML_IDP_SLO_URL'))
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
    assert.lengthOf(settings, 5)
    assert.isDefined(settings.get('AUTH_PROVIDERS'))
    const actualProviders = settings.get('AUTH_PROVIDERS')
    assert.lengthOf(actualProviders, 2)
    assert.isTrue(actualProviders.every((e) => e.protocol === 'saml'))
    assert.equal(settings.get('OIDC_ISSUER_URI'), 'https://oidc.example.com')
    assert.equal(settings.get('OIDC_CLIENT_ID'), 'updated-id')
    assert.equal(settings.get('OIDC_CLIENT_SECRET'), 'updated-secret')
    assert.equal(settings.get('OIDC_INFO_LABEL'), 'One Identity')
    assert.isFalse(settings.has('SAML_IDP_SLO_URL'))
  })
})
