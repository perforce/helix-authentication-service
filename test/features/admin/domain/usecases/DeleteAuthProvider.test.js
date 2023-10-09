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
import DeleteAuthProvider from 'helix-auth-svc/lib/features/admin/domain/usecases/DeleteAuthProvider.js'
import ValidateAuthProvider from 'helix-auth-svc/lib/features/admin/domain/usecases/ValidateAuthProvider.js'
import GetAuthProviders from 'helix-auth-svc/lib/features/login/domain/usecases/GetAuthProviders.js'
import GetSamlAuthnContext from 'helix-auth-svc/lib/features/login/domain/usecases/GetSamlAuthnContext.js'
import TidyAuthProviders from 'helix-auth-svc/lib/features/login/domain/usecases/TidyAuthProviders.js'

describe('DeleteAuthProvider use case', function () {
  const temporaryRepository = new MapSettingsRepository()
  // cannot actually write to process.env, use map instead
  const dotenvRepository = new MapSettingsRepository()
  const defaultsRepository = new DefaultsEnvRepository()
  // construct a realistic repository so GetAuthProviders works properly
  const settingsRepository = new MergedSettingsRepository({
    temporaryRepository,
    dotenvRepository,
    defaultsRepository
  })
  const validateAuthProvider = ValidateAuthProvider()
  const tidyAuthProviders = TidyAuthProviders({
    getSamlAuthnContext: GetSamlAuthnContext(),
    validateAuthProvider
  })
  const usecase = DeleteAuthProvider({
    getAuthProviders: GetAuthProviders({
      defaultsRepository,
      settingsRepository,
      tidyAuthProviders
    }),
  })

  beforeEach(function () {
    temporaryRepository.clear()
  })

  it('should raise an error for invalid input', async function () {
    assert.throws(() => DeleteAuthProvider({ getAuthProviders: null }), AssertionError)
    try {
      await usecase(null)
      assert.fail('should have raised error')
    } catch (err) {
      assert.instanceOf(err, AssertionError)
    }
  })

  it('should ignore provider not found in list', async function () {
    // arrange
    temporaryRepository.set('AUTH_PROVIDERS', JSON.stringify({
      providers: [
        {
          clientId: 'unique-client-identifier',
          clientSecret: 'shared secrets are bad',
          issuerUri: 'https://oidc.example.com',
          selectAccount: 'false',
          signingAlgo: 'RS256',
          label: 'oidc.example.com',
          protocol: 'oidc',
          id: 'xid123'
        }
      ]
    }))
    const provider = {
      clientId: 'client-id',
      clientSecret: 'client-secret',
      issuerUri: 'https://oidc2.example.com',
      label: 'Provider',
      protocol: 'oidc',
      id: 'xid321'
    }
    // act
    const updated = await usecase(provider)
    assert.lengthOf(updated, 1)
    assert.equal(updated[0].id, 'xid123')
  })

  it('should remove matching provider from the list', async function () {
    // arrange
    temporaryRepository.set('AUTH_PROVIDERS', JSON.stringify({
      providers: [
        {
          clientId: 'unique-client-identifier',
          clientSecret: 'shared secrets are bad',
          issuerUri: 'https://oidc.example.com',
          selectAccount: 'false',
          signingAlgo: 'RS256',
          label: 'oidc.example.com',
          protocol: 'oidc',
          id: 'xid123'
        },
        {
          clientId: 'client-id',
          clientSecret: 'client-secret',
          issuerUri: 'https://oidc2.example.com',
          label: 'Provider',
          protocol: 'oidc',
          id: 'xid321'
        }
      ]
    }))
    const provider = {
      clientId: 'client-id',
      clientSecret: 'client-secret',
      issuerUri: 'https://oidc2.example.com',
      label: 'Provider',
      protocol: 'oidc',
      id: 'xid321'
    }
    // act
    const updated = await usecase(provider)
    assert.lengthOf(updated, 1)
    assert.equal(updated[0].id, 'xid123')
  })

  it('should remove a provider but ignore associated files', async function () {
    // arrange
    temporaryRepository.set('AUTH_PROVIDERS', JSON.stringify({
      providers: [
        {
          clientId: 'unique-client-identifier',
          clientSecret: 'shared secrets are bad',
          issuerUri: 'https://oidc.example.com',
          selectAccount: 'false',
          signingAlgo: 'RS256',
          label: 'oidc.example.com',
          protocol: 'oidc',
          id: 'xid123'
        },
        {
          clientId: 'client-id',
          clientSecretFile: 'test/passwd.txt',
          issuerUri: 'https://oidc2.example.com',
          label: 'Provider',
          protocol: 'oidc',
          id: 'xid321'
        }
      ]
    }))
    const provider = {
      clientId: 'client-id',
      clientSecret: 'some client secret',
      issuerUri: 'https://oidc2.example.com',
      label: 'Provider',
      protocol: 'oidc',
      id: 'xid321'
    }
    // act
    const updated = await usecase(provider)
    assert.lengthOf(updated, 1)
    assert.equal(updated[0].id, 'xid123')
    const stats = await fs.stat('test/passwd.txt')
    assert.isDefined(stats)
  })
})
