//
// Copyright 2023 Perforce Software
//
import * as fs from 'node:fs/promises'
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { before, beforeEach, describe, it } from 'mocha'
import { temporaryFile } from 'tempy'
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

  it('should read OIDC client cert and key files', async function () {
    // arrange
    const clientCertFile = temporaryFile({ extension: 'crt' })
    await fs.writeFile(clientCertFile, '-----BEGIN CERTIFICATE-----')
    const clientKeyFile = temporaryFile({ extension: 'key' })
    await fs.writeFile(clientKeyFile, '-----BEGIN PRIVATE KEY-----')
    const providers = [{
      label: 'Veritas Solutions',
      issuerUri: 'https://oidc.exmample.com',
      clientId: 'client-id',
      clientCertFile,
      clientKeyFile,
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
    assert.equal(result[0].clientCert, '-----BEGIN CERTIFICATE-----')
    assert.equal(result[0].clientKey, '-----BEGIN PRIVATE KEY-----')
  })

  it('should not read file properties if so desired', async function () {
    // arrange
    const clientSecretFile = temporaryFile({ extension: 'txt' })
    await fs.writeFile(clientSecretFile, 'my client secret')
    const providers = [{
      label: 'Veritas Solutions',
      issuerUri: 'https://oidc.exmample.com',
      clientId: 'client-id',
      clientSecretFile,
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
    assert.equal(result[0].clientSecretFile, clientSecretFile)
    assert.isFalse(result[0].selectAccount)
    assert.equal(result[0].signingAlgo, 'RS256')
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

  it('should accept plaintext metadata without decoding', async function () {
    // arrange
    const providers = [{
      label: 'Acme Identity',
      protocol: 'saml',
      metadata: '<?xml version="1.0" encoding="utf-8"?><EntityDescriptor ID="_0632f2bb-2575-4df6-8f8f-19663250cecb" entityID="https://sts.windows.net/719d88f3-f957-44cf-9aa5-0a1a3a44f7b9/" xmlns="urn:oasis:names:tc:SAML:2.0:metadata"></EntityDescriptor>'
    }]
    temporaryRepository.set('AUTH_PROVIDERS', providers)
    // act
    const result = await usecase()
    // assert
    assert.lengthOf(result, 1)
    assert.equal(result[0].id, 'saml-0')
    assert.equal(result[0].label, 'Acme Identity')
    assert.equal(result[0].protocol, 'saml')
    assert.isTrue(result[0].metadata.startsWith('<?xml version="1.0" encoding="utf-8"?>'))
    assert.isTrue(result[0].metadata.endsWith('</EntityDescriptor>'))
  })

  it('should decode metadata using old config format', async function () {
    // arrange
    const providers = [{
      label: 'Acme Identity',
      protocol: 'saml',
      metadata: 'PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz48RW50aXR5RGVzY3JpcHRvciBJRD0iXzA2MzJmMmJiLTI1NzUtNGRmNi04ZjhmLTE5NjYzMjUwY2VjYiIgZW50aXR5SUQ9Imh0dHBzOi8vc3RzLndpbmRvd3MubmV0LzcxOWQ4OGYzLWY5NTctNDRjZi05YWE1LTBhMWEzYTQ0ZjdiOS8iIHhtbG5zPSJ1cm46b2FzaXM6bmFtZXM6dGM6U0FNTDoyLjA6bWV0YWRhdGEiPjwvRW50aXR5RGVzY3JpcHRvcj4='
    }]
    temporaryRepository.set('AUTH_PROVIDERS', providers)
    // act
    const result = await usecase()
    // assert
    assert.lengthOf(result, 1)
    assert.equal(result[0].id, 'saml-0')
    assert.equal(result[0].label, 'Acme Identity')
    assert.equal(result[0].protocol, 'saml')
    assert.isTrue(result[0].metadata.startsWith('<?xml version="1.0" encoding="utf-8"?>'))
    assert.isTrue(result[0].metadata.endsWith('</EntityDescriptor>'))
  })

  it('should decode classic metadata using old config format', async function () {
    // arrange
    temporaryRepository.set('SAML_INFO_LABEL', 'Acme Identity')
    temporaryRepository.set('SAML_IDP_METADATA', 'PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz48RW50aXR5RGVzY3JpcHRvciBJRD0iXzA2MzJmMmJiLTI1NzUtNGRmNi04ZjhmLTE5NjYzMjUwY2VjYiIgZW50aXR5SUQ9Imh0dHBzOi8vc3RzLndpbmRvd3MubmV0LzcxOWQ4OGYzLWY5NTctNDRjZi05YWE1LTBhMWEzYTQ0ZjdiOS8iIHhtbG5zPSJ1cm46b2FzaXM6bmFtZXM6dGM6U0FNTDoyLjA6bWV0YWRhdGEiPjwvRW50aXR5RGVzY3JpcHRvcj4=')
    // act
    const result = await usecase()
    // assert
    assert.lengthOf(result, 1)
    assert.equal(result[0].id, 'saml-0')
    assert.equal(result[0].label, 'Acme Identity')
    assert.equal(result[0].protocol, 'saml')
    assert.isTrue(result[0].metadata.startsWith('<?xml version="1.0" encoding="utf-8"?>'))
    assert.isTrue(result[0].metadata.endsWith('</EntityDescriptor>'))
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
