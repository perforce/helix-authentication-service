//
// Copyright 2023 Perforce Software
//
import { AssertionError } from 'node:assert'
import * as fs from 'node:fs/promises'
import { assert } from 'chai'
import { beforeEach, describe, it } from 'mocha'
import { DefaultsEnvRepository } from 'helix-auth-svc/lib/common/data/repositories/DefaultsEnvRepository.js'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'
import { MergedSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MergedSettingsRepository.js'
import AddAuthProvider from 'helix-auth-svc/lib/features/admin/domain/usecases/AddAuthProvider.js'
import ValidateAuthProvider from 'helix-auth-svc/lib/features/admin/domain/usecases/ValidateAuthProvider.js'
import GetAuthProviders from 'helix-auth-svc/lib/features/login/domain/usecases/GetAuthProviders.js'
import GetSamlAuthnContext from 'helix-auth-svc/lib/features/login/domain/usecases/GetSamlAuthnContext.js'
import TidyAuthProviders from 'helix-auth-svc/lib/features/login/domain/usecases/TidyAuthProviders.js'

describe('AddAuthProvider use case', function () {
  const temporaryRepository = new MapSettingsRepository()
  // cannot actually write to process.env, use map instead
  const configuredRepository = new MapSettingsRepository()
  const defaultsRepository = new DefaultsEnvRepository()
  // construct a realistic repository so GetAuthProviders works properly
  const settingsRepository = new MergedSettingsRepository({
    temporaryRepository,
    configuredRepository,
    defaultsRepository
  })
  const validateAuthProvider = ValidateAuthProvider()
  const tidyAuthProviders = TidyAuthProviders({
    getSamlAuthnContext: GetSamlAuthnContext(),
    validateAuthProvider
  })
  const usecase = AddAuthProvider({
    getAuthProviders: GetAuthProviders({ defaultsRepository, settingsRepository, tidyAuthProviders }),
    validateAuthProvider,
    tidyAuthProviders
  })

  beforeEach(function () {
    temporaryRepository.clear()
  })

  it('should raise an error for invalid input', async function () {
    assert.throws(() => AddAuthProvider({
      getAuthProviders: null,
      validateAuthProvider: {},
      tidyAuthProviders: {}
    }), AssertionError)
    assert.throws(() => AddAuthProvider({
      getAuthProviders: {},
      validateAuthProvider: null,
      tidyAuthProviders: {}
    }), AssertionError)
    assert.throws(() => AddAuthProvider({
      getAuthProviders: {},
      validateAuthProvider: {},
      tidyAuthProviders: null
    }), AssertionError)
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
      id: 'xid123'
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
    assert.lengthOf(providers, 1)
    const actual = providers.find((e) => e.clientId === 'client-id')
    assert.isNotNull(actual)
    // ensure provider has an assigned identifier
    assert.equal(provider.id, 'oidc-0')
    assert.equal(provider.id, actual.id)
  })

  it('should update an existing provider', async function () {
    // arrange
    temporaryRepository.set('AUTH_PROVIDERS', [{
      'clientId': 'unique-client-identifier',
      'clientSecret': 'shared secrets are bad',
      'issuerUri': 'https://oidc.example.com',
      'selectAccount': 'false',
      'signingAlgo': 'RS256',
      'label': 'oidc.example.com',
      'protocol': 'oidc',
      'id': 'xid123'
    }])
    const provider = {
      clientId: 'client-id',
      clientSecret: 'client-secret',
      issuerUri: 'https://oidc.example.com',
      selectAccount: 'false',
      signingAlgo: 'RS256',
      label: 'Provider',
      protocol: 'oidc',
      id: 'xid123'
    }
    // act
    const providers = await usecase(provider)
    // assert
    assert.isArray(providers)
    assert.lengthOf(providers, 1)
    const actual = providers.find((e) => e.clientId === 'client-id')
    assert.isNotNull(actual)
    assert.equal(actual.id, 'xid123')
  })

  it('should ignore default provider settings', async function () {
    // arrange
    temporaryRepository.set('AUTH_PROVIDERS', [
      {
        'clientId': 'client-id-1',
        'clientSecret': 'client-secret-1',
        'issuerUri': 'https://oidc1.example.com',
        'label': 'oidc1.example.com',
        'protocol': 'oidc',
        'id': 'oidc-1'
      },
      {
        'clientId': 'client-id-2',
        'clientSecret': 'client-secret-2',
        'issuerUri': 'https://oidc2.example.com',
        'label': 'oidc2.example.com',
        'protocol': 'oidc',
        'id': 'oidc-2'
      }
    ])
    const provider = {
      metadataUrl: 'https://saml.example.com/idp/metadata',
      protocol: 'saml',
      id: 'saml'
    }
    // act
    const providers = await usecase(provider)
    // assert
    assert.isArray(providers)
    assert.lengthOf(providers, 3)
    assert.isTrue(providers.some((e) => e.id === 'saml'))
    assert.isTrue(providers.some((e) => e.id === 'oidc-1'))
    assert.isTrue(providers.some((e) => e.id === 'oidc-2'))
  })

  it('should ignore files from old version of provider', async function () {
    // arrange
    temporaryRepository.set('AUTH_PROVIDERS', [
      {
        clientId: 'client-id',
        clientSecretFile: 'test/passwd.txt',
        issuerUri: 'https://oidc2.example.com',
        label: 'Provider',
        protocol: 'oidc',
        id: 'xid123'
      }
    ])
    const provider = {
      clientId: 'client-id',
      clientSecret: 'updated client secret',
      issuerUri: 'https://oidc2.example.com',
      label: 'Provider',
      protocol: 'oidc',
      id: 'xid123'
    }
    // act
    const updated = await usecase(provider)
    assert.lengthOf(updated, 1)
    assert.equal(updated[0].id, 'xid123')
    assert.property(updated[0], 'clientSecret')
    assert.notProperty(updated[0], 'clientSecretFile')
    const stats = await fs.stat('test/passwd.txt')
    assert.isDefined(stats)
  })
})
