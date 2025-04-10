//
// Copyright 2023 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { before, beforeEach, describe, it } from 'mocha'
import { DefaultsEnvRepository } from 'helix-auth-svc/lib/common/data/repositories/DefaultsEnvRepository.js'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'
import ValidateAuthProvider from 'helix-auth-svc/lib/features/admin/domain/usecases/ValidateAuthProvider.js'
import GenerateLoginUrl from 'helix-auth-svc/lib/features/login/domain/usecases/GenerateLoginUrl.js'
import GetAuthProviders from 'helix-auth-svc/lib/features/login/domain/usecases/GetAuthProviders.js'
import GetSamlAuthnContext from 'helix-auth-svc/lib/features/login/domain/usecases/GetSamlAuthnContext.js'
import TidyAuthProviders from 'helix-auth-svc/lib/features/login/domain/usecases/TidyAuthProviders.js'

describe('GenerateLoginUrl use case', function () {
  const defaultsRepository = new DefaultsEnvRepository()
  const settingsRepository = new MapSettingsRepository()
  const tidyAuthProviders = TidyAuthProviders({
    getSamlAuthnContext: GetSamlAuthnContext(),
    validateAuthProvider: ValidateAuthProvider()
  })
  let usecase

  before(function () {
    const getAuthProviders = GetAuthProviders({ defaultsRepository, settingsRepository, tidyAuthProviders })
    usecase = GenerateLoginUrl({ settingsRepository, getAuthProviders })
  })

  beforeEach(function () {
    settingsRepository.clear()
  })

  it('should raise an error for invalid input', async function () {
    assert.throws(() => GenerateLoginUrl({ settingsRepository: null }), AssertionError)
    assert.throws(() => GenerateLoginUrl({ settingsRepository: {}, getAuthProviders: null }), AssertionError)
    try {
      await usecase(null)
      assert.fail('should have raised error')
    } catch (err) {
      assert.instanceOf(err, AssertionError)
    }
    try {
      await usecase('')
      assert.fail('should have raised error')
    } catch (err) {
      assert.instanceOf(err, AssertionError)
    }
    try {
      await usecase('not-null', null)
      assert.fail('should have raised error')
    } catch (err) {
      assert.instanceOf(err, AssertionError)
    }
    try {
      await usecase('not-null', 'not-null', null)
      assert.fail('should have raised error')
    } catch (err) {
      assert.instanceOf(err, AssertionError)
    }
  })

  it('should produce sensible value with minimal config', async function () {
    // arrange
    // act
    const result = await usecase('http://host', 'request123', 'foobar')
    // assert
    assert.equal(result, 'http://host/multi/login/request123?instanceId=foobar')
  })

  it('should produce OIDC URL with only OIDC_ISSUER_URI', async function () {
    // arrange
    settingsRepository.set('OIDC_ISSUER_URI', 'https://example.com')
    settingsRepository.set('OIDC_CLIENT_ID', 'client-id')
    settingsRepository.set('OIDC_CLIENT_SECRET', 'client-secret')
    // act
    const result = await usecase('http://host', 'request123', 'foobar')
    // assert
    assert.equal(result, 'http://host/oidc/login/request123?instanceId=foobar&providerId=oidc')
  })

  it('should produce SAML URL with only SAML_IDP_SSO_URL', async function () {
    // arrange
    settingsRepository.set('SAML_IDP_SSO_URL', 'https://example.com/saml/sso')
    // act
    const result = await usecase('http://host', 'request123', 'foobar')
    // assert
    assert.equal(result, 'http://host/saml/login/request123?instanceId=foobar&providerId=saml')
  })

  it('should produce multi URL with AUTH_PROVIDERS', async function () {
    // arrange
    settingsRepository.set('AUTH_PROVIDERS', [{
      label: 'Acme Identity',
      metadataUrl: 'https://saml.example.com/idp/metadata',
      protocol: 'saml',
      id: 'saml-1'
    }, {
      label: 'Maximum Security',
      metadataUrl: 'https://saml.example.com/idp/metadata',
      protocol: 'saml',
      id: 'saml-2'
    }])
    // act
    const result = await usecase('http://host', 'request123', 'foobar')
    // assert
    assert.equal(result, 'http://host/multi/login/request123?instanceId=foobar')
  })

  it('should produce multi URL if specified provider not found', async function () {
    // arrange
    settingsRepository.set('AUTH_PROVIDERS', [{
      label: 'Acme Identity',
      metadataUrl: 'https://saml.example.com/idp/metadata',
      protocol: 'saml',
      id: 'saml-1'
    }, {
      label: 'Maximum Security',
      metadataUrl: 'https://saml.example.com/idp/metadata',
      protocol: 'saml',
      id: 'saml-2'
    }])
    // act
    const result = await usecase('http://host', 'request123', 'foobar', 'oidc-1')
    // assert
    assert.equal(result, 'http://host/multi/login/request123?instanceId=foobar')
  })

  it('should produce specific URL if a provider is default', async function () {
    // arrange
    settingsRepository.set('AUTH_PROVIDERS', [{
      label: 'Acme Identity',
      metadataUrl: 'https://saml.example.com/idp/metadata',
      protocol: 'saml',
      default: true
    }, {
      label: 'Maximum Security',
      metadataUrl: 'https://saml.example.com/idp/metadata',
      protocol: 'saml'
    }])
    // act
    const result = await usecase('http://host', 'request123', 'foobar')
    // assert
    assert.equal(result, 'http://host/saml/login/request123?instanceId=foobar&providerId=saml-0')
  })

  it('should produce specific URL if specified provider found', async function () {
    // arrange
    settingsRepository.set('AUTH_PROVIDERS', [{
      label: 'Acme Identity',
      metadataUrl: 'https://saml.example.com/idp/metadata',
      protocol: 'saml',
      default: true
    }, {
      label: 'Maximum Security',
      metadataUrl: 'https://saml.example.com/idp/metadata',
      protocol: 'saml'
    }])
    // act
    const result = await usecase('http://host', 'request123', 'foobar', 'saml-1')
    // assert
    assert.equal(result, 'http://host/saml/login/request123?instanceId=foobar&providerId=saml-1')
  })
})
