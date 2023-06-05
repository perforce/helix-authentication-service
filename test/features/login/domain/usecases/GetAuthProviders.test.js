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
import ValidateAuthProvider from 'helix-auth-svc/lib/features/admin/domain/usecases/ValidateAuthProvider.js'
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
    const tidyAuthProviders = TidyAuthProviders({ validateAuthProvider: ValidateAuthProvider() })
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

  it('should ignore default settings when no AUTH_PROVIDERS', async function () {
    // arrange
    // act
    const result = await usecase()
    // assert
    assert.lengthOf(result, 0)
  })

  it('should return the single configured provider', async function () {
    // arrange
    const providers = {
      providers: [{
        label: 'Acme Identity',
        metadataUrl: 'https://saml.exmample.com',
        protocol: 'saml'
      }]
    }
    temporaryRepository.set('AUTH_PROVIDERS', JSON.stringify(providers))
    // act
    const result = await usecase()
    // assert
    assert.lengthOf(result, 1)
    assert.property(result[0], 'id')
    assert.equal(result[0].label, 'Acme Identity')
    assert.equal(result[0].protocol, 'saml')
  })

  it('should assign protocol if missing', async function () {
    // arrange
    const providers = {
      providers: [{
        label: 'Acme Identity',
        issuerUri: 'https://example.com',
        clientId: 'client-id',
        clientSecret: 'client-secret'
      }]
    }
    temporaryRepository.set('AUTH_PROVIDERS', JSON.stringify(providers))
    // act
    const result = await usecase()
    // assert
    assert.lengthOf(result, 1)
    assert.property(result[0], 'id')
    assert.equal(result[0].label, 'Acme Identity')
    assert.equal(result[0].protocol, 'oidc')
  })

  it('should assign unique identifier to each provider', async function () {
    // arrange
    const providers = {
      providers: [
        {
          label: 'Azure',
          metadataUrl: 'https://saml.example.com',
          protocol: 'saml'
        },
        {
          label: 'Okta',
          issuerUri: 'https://example.com',
          clientId: 'client-id',
          clientSecret: 'client-secret',
          protocol: 'oidc'
        },
        {
          label: 'Auth0',
          metadataUrl: 'https://saml.example.com',
          protocol: 'saml'
        }
      ]
    }
    temporaryRepository.set('AUTH_PROVIDERS', JSON.stringify(providers))
    // act
    const result = await usecase()
    // assert
    assert.lengthOf(result, 3)
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
      providers: [{
        label: 'Acme Identity',
        metadataUrl: 'https://saml.example.com',
        protocol: 'saml'
      }]
    }
    fs.writeFileSync(providersFile, JSON.stringify(providers))
    temporaryRepository.set('AUTH_PROVIDERS_FILE', providersFile)
    // act
    const result = await usecase()
    // assert
    assert.lengthOf(result, 1)
    assert.property(result[0], 'id')
    assert.equal(result[0].label, 'Acme Identity')
    assert.equal(result[0].protocol, 'saml')
  })


  it('should assign default and label properties', async function () {
    // arrange
    temporaryRepository.set('OIDC_ISSUER_URI', 'https://oidc.example.com:8080/issuer')
    temporaryRepository.set('OIDC_CLIENT_ID', 'client-id')
    temporaryRepository.set('OIDC_CLIENT_SECRET', 'client-secret')
    temporaryRepository.set('OIDC_INFO_LABEL', 'OpenID Provider')
    temporaryRepository.set('DEFAULT_PROTOCOL', 'oidc')
    // act
    const result = await usecase()
    // assert
    assert.lengthOf(result, 1)
    assert.property(result[0], 'id')
    assert.equal(result[0].label, 'OpenID Provider')
    assert.equal(result[0].protocol, 'oidc')
    assert.equal(result[0].default, true)
  })
})
