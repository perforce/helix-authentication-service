//
// Copyright 2023 Perforce Software
//
import * as fs from 'node:fs'
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { before, beforeEach, describe, it } from 'mocha'
import { temporaryFile } from 'tempy'
import { DefaultsEnvRepository } from 'helix-auth-svc/lib/common/data/repositories/DefaultsEnvRepository.js'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'
import { MergedSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MergedSettingsRepository.js'
import GetAuthProviders from 'helix-auth-svc/lib/features/login/domain/usecases/GetAuthProviders.js'
import TidyAuthProviders from 'helix-auth-svc/lib/features/login/domain/usecases/TidyAuthProviders.js'

describe('GetAuthProviders use case', function () {
  const temporaryRepository = new MapSettingsRepository()
  // cannot actually write to process.env, use map instead
  const processEnvRepository = new MapSettingsRepository()
  const defaultsRepository = new DefaultsEnvRepository()
  // construct a realistic repository so GetAuthProviders works properly
  const settingsRepository = new MergedSettingsRepository({
    temporaryRepository,
    processEnvRepository,
    defaultsRepository
  })
  let usecase

  before(function () {
    const tidyAuthProviders = TidyAuthProviders()
    usecase = GetAuthProviders({ settingsRepository, tidyAuthProviders })
  })

  beforeEach(function () {
    temporaryRepository.clear()
  })

  it('should raise an error for invalid input', async function () {
    assert.throws(() => GetAuthProviders({ settingsRepository: null, tidyAuthProviders: {} }), AssertionError)
    assert.throws(() => GetAuthProviders({ settingsRepository: {}, tidyAuthProviders: null }), AssertionError)
  })

  it('should raise error for malformed input', async function () {
    // arrange
    const providers = '["not_valid": "json"]'
    temporaryRepository.set('AUTH_PROVIDERS', providers)
    try {
      // act
      await usecase()
      assert.fail('should have raised error')
    } catch (err) {
      // assert
      assert.include(err.message, 'Unexpected token')
    }
  })

  it('should convert default settings when no AUTH_PROVIDERS', async function () {
    // arrange
    // act
    const result = await usecase()
    // assert
    assert.lengthOf(result, 2)
    assert.equal(result[0].protocol, 'oidc')
    assert.notProperty(result[0], 'id')
    assert.notProperty(result[0], 'label')
    assert.equal(result[1].protocol, 'saml')
    assert.notProperty(result[1], 'id')
    assert.notProperty(result[1], 'label')
  })

  it('should merge defaults and configured providers', async function () {
    // arrange
    const providers = {
      providers: [{ label: 'Acme Identity', protocol: 'saml' }]
    }
    temporaryRepository.set('AUTH_PROVIDERS', JSON.stringify(providers))
    // act
    const result = await usecase()
    // assert
    assert.lengthOf(result, 3)
    assert.property(result[0], 'id')
    assert.equal(result[0].label, 'Acme Identity')
    assert.equal(result[0].protocol, 'saml')
    assert.equal(result[1].protocol, 'oidc')
    assert.notProperty(result[1], 'id')
    assert.notProperty(result[1], 'label')
    assert.equal(result[2].protocol, 'saml')
    assert.notProperty(result[2], 'id')
    assert.notProperty(result[2], 'label')
  })

  it('should assign protocol if missing', async function () {
    // arrange
    const providers = {
      providers: [{ label: 'Acme Identity', issuerUri: 'https://example.com' }]
    }
    temporaryRepository.set('AUTH_PROVIDERS', JSON.stringify(providers))
    // act
    const result = await usecase()
    // assert
    assert.lengthOf(result, 3)
    assert.property(result[0], 'id')
    assert.equal(result[0].label, 'Acme Identity')
    assert.equal(result[0].protocol, 'oidc')
    assert.equal(result[1].protocol, 'oidc')
    assert.equal(result[2].protocol, 'saml')
  })

  it('should assign unique identifier to each provider', async function () {
    // arrange
    const providers = {
      providers: [
        { label: 'Azure', protocol: 'saml' },
        { label: 'Okta', protocol: 'oidc' },
        { label: 'Auth0', protocol: 'saml' }
      ]
    }
    temporaryRepository.set('AUTH_PROVIDERS', JSON.stringify(providers))
    // act
    const result = await usecase()
    // assert
    assert.lengthOf(result, 5)
    const ids = new Set()
    for (const entry of result) {
      // incomplete converted providers do not have label/id properties
      if (entry.id) {
        assert.isFalse(ids.has(entry.id))
        ids.add(entry.id)
      }
    }
  })

  it('should read providers from a file', async function () {
    // arrange
    const providersFile = temporaryFile({ extension: 'json' })
    const providers = {
      providers: [{ label: 'Acme Identity', protocol: 'saml' }]
    }
    fs.writeFileSync(providersFile, JSON.stringify(providers))
    temporaryRepository.set('AUTH_PROVIDERS_FILE', providersFile)
    // act
    const result = await usecase()
    // assert
    assert.lengthOf(result, 3)
    assert.property(result[0], 'id')
    assert.equal(result[0].label, 'Acme Identity')
    assert.equal(result[0].protocol, 'saml')
    assert.equal(result[1].protocol, 'oidc')
    assert.equal(result[2].protocol, 'saml')
  })


  it('should assign default and label properties', async function () {
    // arrange
    temporaryRepository.set('OIDC_ISSUER_URI', 'https://oidc.example.com:8080/issuer')
    temporaryRepository.set('OIDC_INFO_LABEL', 'OpenID Provider')
    temporaryRepository.set('DEFAULT_PROTOCOL', 'oidc')
    // act
    const result = await usecase()
    // assert
    assert.lengthOf(result, 2)
    assert.property(result[0], 'id')
    assert.equal(result[0].label, 'OpenID Provider')
    assert.equal(result[0].protocol, 'oidc')
    assert.equal(result[0].default, true)
    assert.equal(result[1].protocol, 'saml')
  })
})
