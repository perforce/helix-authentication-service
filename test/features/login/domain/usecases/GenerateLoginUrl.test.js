//
// Copyright 2022 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { before, beforeEach, describe, it } from 'mocha'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'
import GenerateLoginUrl from 'helix-auth-svc/lib/features/login/domain/usecases/GenerateLoginUrl.js'
import GetAuthProviders from 'helix-auth-svc/lib/features/login/domain/usecases/GetAuthProviders.js'

describe('GenerateLoginUrl use case', function () {
  const settings = new Map()
  let usecase

  before(function () {
    const settingsRepository = new MapSettingsRepository(settings)
    const getAuthProviders = GetAuthProviders({ settingsRepository })
    usecase = GenerateLoginUrl({ settingsRepository, getAuthProviders })
  })

  beforeEach(function () {
    settings.clear()
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

  it('should produce sensible value without service URI', async function () {
    // arrange
    // act
    const result = await usecase('', 'request123', 'none')
    // assert
    assert.equal(result, '/saml/login/request123?instanceId=none')
  })

  it('should produce sensible value with minimal config', async function () {
    // arrange
    // act
    const result = await usecase('http://host', 'request123', 'foobar')
    // assert
    assert.equal(result, 'http://host/saml/login/request123?instanceId=foobar')
  })

  it('should produce OIDC URL with only OIDC_ISSUER_URI', async function () {
    // arrange
    settings.set('OIDC_ISSUER_URI', 'https://example.com')
    // act
    const result = await usecase('http://host', 'request123', 'foobar')
    // assert
    assert.equal(result, 'http://host/oidc/login/request123?instanceId=foobar')
  })

  it('should produce SAML URL with only SAML_IDP_SSO_URL', async function () {
    // arrange
    settings.set('SAML_IDP_SSO_URL', 'https://example.com/saml/sso')
    // act
    const result = await usecase('http://host', 'request123', 'foobar')
    // assert
    assert.equal(result, 'http://host/saml/login/request123?instanceId=foobar')
  })

  it('should produce special URL with DEFAULT_PROTOCOL', async function () {
    // arrange
    settings.set('DEFAULT_PROTOCOL', 'pigeon')
    // act
    const result = await usecase('http://host', 'request123', 'foobar')
    // assert
    assert.equal(result, 'http://host/pigeon/login/request123?instanceId=foobar')
  })

  it('should produce multi URL with AUTH_PROVIDERS', async function () {
    // arrange
    const providers = {
      providers: [{
        label: 'Acme Identity',
        protocol: 'saml'
      }]
    }
    settings.set('AUTH_PROVIDERS', JSON.stringify(providers))
    // act
    const result = await usecase('http://host', 'request123', 'foobar')
    // assert
    assert.equal(result, 'http://host/multi/login/request123?instanceId=foobar')
  })
})
