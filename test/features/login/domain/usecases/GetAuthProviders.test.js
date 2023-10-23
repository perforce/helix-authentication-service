//
// Copyright 2023 Perforce Software
//
import * as fs from 'node:fs/promises'
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { before, beforeEach, describe, it } from 'mocha'
import { DefaultsEnvRepository } from 'helix-auth-svc/lib/common/data/repositories/DefaultsEnvRepository.js'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'
import { MergedSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MergedSettingsRepository.js'
import ValidateAuthProvider from 'helix-auth-svc/lib/features/admin/domain/usecases/ValidateAuthProvider.js'
import GetAuthProviders from 'helix-auth-svc/lib/features/login/domain/usecases/GetAuthProviders.js'
import GetSamlAuthnContext from 'helix-auth-svc/lib/features/login/domain/usecases/GetSamlAuthnContext.js'
import TidyAuthProviders from 'helix-auth-svc/lib/features/login/domain/usecases/TidyAuthProviders.js'

describe('GetAuthProviders use case', function () {
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
  let usecase

  before(function () {
    const tidyAuthProviders = TidyAuthProviders({
      getSamlAuthnContext: GetSamlAuthnContext(),
      validateAuthProvider: ValidateAuthProvider()
    })
    usecase = GetAuthProviders({ defaultsRepository, settingsRepository, tidyAuthProviders })
  })

  beforeEach(function () {
    temporaryRepository.clear()
  })

  it('should raise an error for invalid input', async function () {
    assert.throws(() => GetAuthProviders({
      defaultsRepository: null,
      settingsRepository: {},
      tidyAuthProviders: {}
    }), AssertionError)
    assert.throws(() => GetAuthProviders({
      defaultsRepository: {},
      settingsRepository: null,
      tidyAuthProviders: {}
    }), AssertionError)
    assert.throws(() => GetAuthProviders({
      defaultsRepository: {},
      settingsRepository: {},
      tidyAuthProviders: null
    }), AssertionError)
  })

  it('should ignore default settings when no AUTH_PROVIDERS', async function () {
    // arrange
    // act
    const result = await usecase()
    // assert
    assert.lengthOf(result, 0)
  })

  it('should return a SAML provider with defaults', async function () {
    // arrange
    const providers = [{
      label: 'Acme Identity',
      metadataUrl: 'https://saml.exmample.com',
      protocol: 'saml'
    }]
    temporaryRepository.set('AUTH_PROVIDERS', providers)
    // act
    const result = await usecase()
    // assert
    assert.lengthOf(result, 1)
    assert.equal(result[0].id, 'saml-0')
    assert.equal(result[0].label, 'Acme Identity')
    assert.equal(result[0].protocol, 'saml')
    assert.isTrue(result[0].wantAssertionSigned)
    assert.isTrue(result[0].wantResponseSigned)
    assert.equal(result[0].spEntityId, 'https://has.example.com')
    assert.equal(result[0].keyAlgorithm, 'sha256')
    assert.equal(result[0].authnContext, 'urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport')
    assert.equal(result[0].nameIdFormat, 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified')
  })

  it('should return classic SAML with defaults', async function () {
    // arrange
    temporaryRepository.set('SAML_IDP_METADATA_URL', 'https://saml.exmample.com')
    temporaryRepository.set('SAML_INFO_LABEL', 'Acme Identity')
    // act
    const result = await usecase()
    // assert
    assert.lengthOf(result, 1)
    assert.equal(result[0].id, 'saml')
    assert.equal(result[0].label, 'Acme Identity')
    assert.equal(result[0].protocol, 'saml')
    assert.isTrue(result[0].wantAssertionSigned)
    assert.isTrue(result[0].wantResponseSigned)
    assert.equal(result[0].spEntityId, 'https://has.example.com')
    assert.equal(result[0].keyAlgorithm, 'sha256')
    assert.equal(result[0].authnContext, 'urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport')
    assert.equal(result[0].nameIdFormat, 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified')
  })

  it('should return an OIDC provider with defaults', async function () {
    // arrange
    const providers = [{
      label: 'Veritas Solutions',
      issuerUri: 'https://oidc.exmample.com',
      clientId: 'client-id',
      clientSecret: 'client-secret',
      protocol: 'oidc'
    }]
    temporaryRepository.set('AUTH_PROVIDERS', providers)
    // act
    const result = await usecase()
    // assert
    assert.lengthOf(result, 1)
    assert.equal(result[0].id, 'oidc-0')
    assert.equal(result[0].label, 'Veritas Solutions')
    assert.equal(result[0].protocol, 'oidc')
    assert.isFalse(result[0].selectAccount)
    assert.equal(result[0].signingAlgo, 'RS256')
  })

  it('should not read file properties if so desired', async function () {
    // arrange
    await fs.writeFile('client-secret.txt', 'my client secret')
    const providers = [{
      label: 'Veritas Solutions',
      issuerUri: 'https://oidc.exmample.com',
      clientId: 'client-id',
      clientSecretFile: 'client-secret.txt',
      protocol: 'oidc'
    }]
    temporaryRepository.set('AUTH_PROVIDERS', providers)
    // act
    const result = await usecase({ loadFiles: false })
    // assert
    assert.lengthOf(result, 1)
    assert.equal(result[0].id, 'oidc-0')
    assert.equal(result[0].label, 'Veritas Solutions')
    assert.equal(result[0].protocol, 'oidc')
    assert.notProperty(result[0], 'clientSecret')
    assert.property(result[0], 'clientSecretFile')
    assert.equal(result[0].clientSecretFile, 'client-secret.txt')
    assert.isFalse(result[0].selectAccount)
    assert.equal(result[0].signingAlgo, 'RS256')
    fs.unlink('client-secret.txt')
  })

  it('should return classic OIDC with defaults', async function () {
    // arrange
    temporaryRepository.set('OIDC_ISSUER_URI', 'https://oidc.exmample.com')
    temporaryRepository.set('OIDC_CLIENT_ID', 'client-id')
    temporaryRepository.set('OIDC_CLIENT_SECRET', 'client-secret')
    temporaryRepository.set('OIDC_INFO_LABEL', 'Veritas Solutions')
    // act
    const result = await usecase()
    // assert
    assert.lengthOf(result, 1)
    assert.equal(result[0].id, 'oidc')
    assert.equal(result[0].label, 'Veritas Solutions')
    assert.equal(result[0].protocol, 'oidc')
    assert.isFalse(result[0].selectAccount)
    assert.equal(result[0].signingAlgo, 'RS256')
  })

  it('should assign protocol if missing', async function () {
    // arrange
    const providers = [{
      label: 'Acme Identity',
      issuerUri: 'https://example.com',
      clientId: 'client-id',
      clientSecret: 'client-secret'
    }]
    temporaryRepository.set('AUTH_PROVIDERS', providers)
    // act
    const result = await usecase()
    // assert
    assert.lengthOf(result, 1)
    assert.property(result[0], 'id')
    assert.equal(result[0].label, 'Acme Identity')
    assert.equal(result[0].protocol, 'oidc')
  })

  it('should ignore OIDC defaults if properties defined', async function () {
    // arrange
    const providers = [{
      label: 'Acme Identity',
      issuerUri: 'https://oidc.example.com',
      clientId: 'client-id',
      clientSecret: 'client-secret',
      selectAccount: true,
      signingAlgo: 'HS512'
    }]
    temporaryRepository.set('AUTH_PROVIDERS', providers)
    // act
    const result = await usecase()
    // assert
    assert.lengthOf(result, 1)
    assert.equal(result[0].id, 'oidc-0')
    assert.equal(result[0].label, 'Acme Identity')
    assert.equal(result[0].protocol, 'oidc')
    assert.equal(result[0].issuerUri, 'https://oidc.example.com')
    assert.isTrue(result[0].selectAccount)
    assert.equal(result[0].signingAlgo, 'HS512')
  })

  it('should ignore SAML defaults if properties defined', async function () {
    // arrange
    const providers = [{
      label: 'Acme Identity',
      metadataUrl: 'https://saml.example.com',
      nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      authnContext: 'urn:oasis:names:tc:SAML:2.0:ac:classes:PreviousSession'
    }]
    temporaryRepository.set('AUTH_PROVIDERS', providers)
    // act
    const result = await usecase()
    // assert
    assert.lengthOf(result, 1)
    assert.equal(result[0].id, 'saml-0')
    assert.equal(result[0].label, 'Acme Identity')
    assert.equal(result[0].protocol, 'saml')
    assert.equal(result[0].nameIdFormat, 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress')
    assert.equal(result[0].authnContext, 'urn:oasis:names:tc:SAML:2.0:ac:classes:PreviousSession')
  })

  it('should assign unique identifier to each provider', async function () {
    // arrange
    const providers = [
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
    temporaryRepository.set('AUTH_PROVIDERS', providers)
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

  it('should ignore empty SAML_AUTHN_CONTEXT value', async function () {
    // arrange
    temporaryRepository.set('SAML_AUTHN_CONTEXT', '')
    temporaryRepository.set('SAML_INFO_LABEL', 'Acme Identity')
    temporaryRepository.set('SAML_IDP_METADATA_URL', 'https://saml.example.com/idp/metadata')
    // act
    const result = await usecase()
    // assert
    assert.lengthOf(result, 1)
    assert.equal(result[0].id, 'saml')
    assert.equal(result[0].label, 'Acme Identity')
    assert.equal(result[0].protocol, 'saml')
    assert.equal(result[0].metadataUrl, 'https://saml.example.com/idp/metadata')
    assert.isUndefined(result[0].authnContext)
  })
})
