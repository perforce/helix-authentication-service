//
// Copyright 2023 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { beforeEach, describe, it } from 'mocha'
import { DefaultsEnvRepository } from 'helix-auth-svc/lib/common/data/repositories/DefaultsEnvRepository.js'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'
import { MergedSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MergedSettingsRepository.js'
import AddAuthProvider from 'helix-auth-svc/lib/features/admin/domain/usecases/AddAuthProvider.js'
import ValidateAuthProvider from 'helix-auth-svc/lib/features/admin/domain/usecases/ValidateAuthProvider.js'
import GetAuthProviders from 'helix-auth-svc/lib/features/login/domain/usecases/GetAuthProviders.js'

describe('AddAuthProvider use case', function () {
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
  const usecase = AddAuthProvider({
    getAuthProviders: GetAuthProviders({ settingsRepository }),
    validateAuthProvider: ValidateAuthProvider()
  })

  beforeEach(function () {
    temporaryRepository.clear()
  })

  it('should raise an error for invalid input', async function () {
    assert.throws(() => AddAuthProvider({ getAuthProviders: null, validateAuthProvider: {} }), AssertionError)
    assert.throws(() => AddAuthProvider({ getAuthProviders: {}, validateAuthProvider: null }), AssertionError)
    try {
      await usecase(null)
      assert.fail('should have raised error')
    } catch (err) {
      assert.instanceOf(err, AssertionError)
    }
  })

  it('should raise error for invalid provider', async function () {
    // arrange
    const provider = {
      clientId: 'client-id',
      clientSecret: 'client-secret',
      issuerUri: 'https://oidc.example.com',
      selectAccount: 'false',
      signingAlgo: 'RS256',
      label: 'Provider',
      id: 'oidc-1'
    }
    try {
      // act
      await usecase(provider)
      assert.fail('should have raised error')
    } catch (err) {
      // assert
      assert.instanceOf(err, AssertionError)
      assert.include(err.message, 'missing protocol property')
    }
  })

  it('should add a new provider and assign identifier', async function () {
    // arrange
    const provider = {
      clientId: 'client-id',
      clientSecret: 'client-secret',
      issuerUri: 'https://oidc.example.com',
      selectAccount: 'false',
      signingAlgo: 'RS256',
      label: 'Provider',
      protocol: 'oidc'
    }
    // act
    const providers = await usecase(provider)
    // assert
    assert.isArray(providers)
    assert.lengthOf(providers, 3)
    const actual = providers.find((e) => e.clientId === 'client-id')
    assert.isNotNull(actual)
    // ensure provider has an assigned identifier
    assert.match(provider.id, /^oidc-\d+/)
    assert.equal(provider.id, actual.id)
  })

  it('should update an existing provider', async function () {
    // arrange
    temporaryRepository.set('AUTH_PROVIDERS', JSON.stringify({
      providers: [
        {
          'clientId': 'unique-client-identifier',
          'clientSecret': 'shared secrets are bad',
          'issuerUri': 'https://oidc.example.com',
          'selectAccount': 'false',
          'signingAlgo': 'RS256',
          'label': 'oidc.example.com',
          'protocol': 'oidc',
          'id': 'oidc-1'
        }
      ]
    }))
    const provider = {
      clientId: 'client-id',
      clientSecret: 'client-secret',
      issuerUri: 'https://oidc.example.com',
      selectAccount: 'false',
      signingAlgo: 'RS256',
      label: 'Provider',
      protocol: 'oidc',
      id: 'oidc-1'
    }
    // act
    const providers = await usecase(provider)
    // assert
    assert.isArray(providers)
    assert.lengthOf(providers, 3)
    const actual = providers.find((e) => e.clientId === 'client-id')
    assert.isNotNull(actual)
    assert.equal(actual.id, 'oidc-1')
  })
})
