//
// Copyright 2023 Perforce Software
//
import * as fs from 'node:fs'
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { before, beforeEach, describe, it } from 'mocha'
import { temporaryFile } from 'tempy'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'
import GetAuthProviders from 'helix-auth-svc/lib/features/login/domain/usecases/GetAuthProviders.js'

describe('GenerateLoginUrl use case', function () {
  const settingsRepository = new MapSettingsRepository()
  let usecase

  before(function () {
    usecase = GetAuthProviders({ settingsRepository })
  })

  beforeEach(function () {
    settingsRepository.clear()
  })

  it('should raise an error for invalid input', async function () {
    assert.throws(() => GetAuthProviders({ settingsRepository: null }), AssertionError)
  })

  it('should raise error for malformed input', async function () {
    // arrange
    const providers = '["not_valid": "json"]'
    settingsRepository.set('AUTH_PROVIDERS', providers)
    try {
      // act
      await usecase()
      assert.fail('should have raised error')
    } catch (err) {
      // assert
      assert.include(err.message, 'Unexpected token')
    }
  })

  it('should return null with no AUTH_PROVIDERS', async function () {
    // arrange
    // act
    const result = await usecase()
    // assert
    assert.isNull(result)
  })

  it('should return the one SAML provider', async function () {
    // arrange
    const providers = {
      providers: [{ label: 'Acme Identity', protocol: 'saml' }]
    }
    settingsRepository.set('AUTH_PROVIDERS', JSON.stringify(providers))
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
      providers: [{ label: 'Acme Identity', issuerUri: 'https://example.com' }]
    }
    settingsRepository.set('AUTH_PROVIDERS', JSON.stringify(providers))
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
        { label: 'Azure', protocol: 'saml' },
        { label: 'Okta', protocol: 'oidc' },
        { label: 'Auth0', protocol: 'saml' }
      ]
    }
    settingsRepository.set('AUTH_PROVIDERS', JSON.stringify(providers))
    // act
    const result = await usecase()
    // assert
    assert.lengthOf(result, 3)
    const ids = new Set()
    for (const entry of result) {
      assert.isFalse(ids.has(entry.id))
      ids.add(entry.id)
    }
  })

  it('should read providers from a file', async function () {
    // arrange
    const providersFile = temporaryFile({ extension: 'json' })
    const providers = {
      providers: [{ label: 'Acme Identity', protocol: 'saml' }]
    }
    fs.writeFileSync(providersFile, JSON.stringify(providers))
    settingsRepository.set('AUTH_PROVIDERS_FILE', providersFile)
    // act
    const result = await usecase()
    // assert
    assert.lengthOf(result, 1)
    assert.property(result[0], 'id')
    assert.equal(result[0].label, 'Acme Identity')
    assert.equal(result[0].protocol, 'saml')
  })
})
