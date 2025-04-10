//
// Copyright 2025 Perforce Software
//
import { assert } from 'chai'
import { beforeEach, describe, it } from 'mocha'
import { DefaultsEnvRepository } from 'helix-auth-svc/lib/common/data/repositories/DefaultsEnvRepository.js'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'
import { MergedSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MergedSettingsRepository.js'
import AddAuthProvider from 'helix-auth-svc/lib/features/admin/domain/usecases/AddAuthProvider.js'
import DeleteAuthProvider from 'helix-auth-svc/lib/features/admin/domain/usecases/DeleteAuthProvider.js'
import ValidateAuthProvider from 'helix-auth-svc/lib/features/admin/domain/usecases/ValidateAuthProvider.js'
import GetAuthProviders from 'helix-auth-svc/lib/features/login/domain/usecases/GetAuthProviders.js'
import GetSamlAuthnContext from 'helix-auth-svc/lib/features/login/domain/usecases/GetSamlAuthnContext.js'
import TidyAuthProviders from 'helix-auth-svc/lib/features/login/domain/usecases/TidyAuthProviders.js'

describe('Adding and removing providers', function () {
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
  const getProviders = GetAuthProviders({ defaultsRepository, settingsRepository, tidyAuthProviders })
  const addProvider = AddAuthProvider({
    getAuthProviders: getProviders,
    validateAuthProvider,
    tidyAuthProviders
  })
  const deleteProvider = DeleteAuthProvider({
    getAuthProviders: getProviders,
  })

  beforeEach(function () {
    temporaryRepository.clear()
  })

  it('should add a new SAML provider', async function () {
    // arrange
    const provider = {
      authnContext: ['urn:oasis:names:tc:SAML:2.0:ac:classes:unspecified'],
      metadataUrl: 'https://example.auth0.com/samlp/metadata/ExAMpLE',
      label: 'example.auth0.com',
      nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      spEntityId: 'urn:example:sp',
      wantAssertionSigned: false,
      wantResponseSigned: false,
      protocol: 'saml'
    }
    // act
    const result = await addProvider(provider)
    configuredRepository.set('AUTH_PROVIDERS', result)
    const providers = await getProviders()
    // assert
    assert.isArray(providers)
    assert.lengthOf(providers, 1)
    assert.hasAllKeys(providers[0], [
      'id', 'label', 'protocol', 'wantAssertionSigned', 'wantResponseSigned', 'forceAuthn',
      'spEntityId', 'keyAlgorithm', 'authnContext', 'nameIdFormat', 'metadataUrl', 'disableContext'
    ])
    assert.equal(providers[0].id, 'saml-0')
    assert.equal(providers[0].label, 'example.auth0.com')
    assert.equal(providers[0].protocol, 'saml')
    assert.isFalse(providers[0].wantAssertionSigned)
    assert.isFalse(providers[0].wantResponseSigned)
    assert.isFalse(providers[0].forceAuthn)
    assert.equal(providers[0].spEntityId, 'urn:example:sp')
    assert.equal(providers[0].keyAlgorithm, 'sha256')
    assert.equal(providers[0].authnContext, 'urn:oasis:names:tc:SAML:2.0:ac:classes:unspecified')
    assert.equal(providers[0].nameIdFormat, 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress')
    assert.equal(providers[0].metadataUrl, 'https://example.auth0.com/samlp/metadata/ExAMpLE')
    assert.isFalse(providers[0].disableContext)
  })

  it('should add a new OIDC provider', async function () {
    // arrange
    const provider = {
      clientId: '0oa84g5ccjhTcLiPr357',
      clientSecret: 'dIVTgYc6awmRR7iOdiWKqia',
      issuerUri: 'https://dev-example.okta.com',
      selectAccount: 'false',
      signingAlgo: 'RS256',
      label: 'Okta Example',
      protocol: 'oidc'
    }
    // act
    const result = await addProvider(provider)
    // assert
    assert.isArray(result)
    assert.lengthOf(result, 2)
    configuredRepository.set('AUTH_PROVIDERS', result)
    const providers = await getProviders()
    assert.isArray(providers)
    assert.lengthOf(providers, 2)
    for (const entry of providers) {
      if (entry.protocol === 'saml') {
        assert.hasAllKeys(entry, [
          'id', 'label', 'protocol', 'wantAssertionSigned', 'wantResponseSigned', 'forceAuthn',
          'spEntityId', 'keyAlgorithm', 'authnContext', 'nameIdFormat', 'metadataUrl', 'disableContext'
        ])
        assert.equal(entry.id, 'saml-0')
        assert.equal(entry.label, 'example.auth0.com')
        assert.equal(entry.protocol, 'saml')
        assert.isFalse(entry.wantAssertionSigned)
        assert.isFalse(entry.wantResponseSigned)
        assert.isFalse(entry.forceAuthn)
        assert.equal(entry.spEntityId, 'urn:example:sp')
        assert.equal(entry.keyAlgorithm, 'sha256')
        assert.equal(entry.authnContext, 'urn:oasis:names:tc:SAML:2.0:ac:classes:unspecified')
        assert.equal(entry.nameIdFormat, 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress')
        assert.equal(entry.metadataUrl, 'https://example.auth0.com/samlp/metadata/ExAMpLE')
        assert.isFalse(entry.disableContext)
      } else if (entry.protocol === 'oidc') {
        assert.hasAllKeys(entry, [
          'id', 'label', 'protocol', 'clientId', 'clientSecret',
          'issuerUri', 'selectAccount', 'signingAlgo'
        ])
        assert.equal(entry.id, 'oidc-1')
        assert.equal(entry.label, 'Okta Example')
        assert.equal(entry.protocol, 'oidc')
        assert.equal(entry.clientId, '0oa84g5ccjhTcLiPr357')
        assert.equal(entry.clientSecret, 'dIVTgYc6awmRR7iOdiWKqia')
        assert.equal(entry.issuerUri, 'https://dev-example.okta.com')
        assert.isFalse(entry.selectAccount)
        assert.equal(entry.signingAlgo, 'RS256')
      }
    }
  })

  it('should add another new OIDC provider', async function () {
    // arrange
    const provider = {
      clientId: 'WPHyLwfzGHdC0g76CksZ4hKmqn0iIGJ3',
      clientSecret: 'qfvb7G8Wi6fCinf010lBXsO_PaSmt',
      issuerUri: 'https://example.google.com/',
      protocol: 'oidc'
    }
    // act
    const result = await addProvider(provider)
    // assert
    assert.isArray(result)
    assert.lengthOf(result, 3)
    configuredRepository.set('AUTH_PROVIDERS', result)
    const providers = await getProviders()
    assert.isArray(providers)
    assert.lengthOf(providers, 3)
    assert.isTrue(providers.some((e) => e.id === 'saml-0'))
    assert.isTrue(providers.some((e) => e.id === 'oidc-1'))
    assert.isTrue(providers.some((e) => e.id === 'oidc-2'))
    for (const entry of providers) {
      if (entry.id === 'saml-0') {
        assert.hasAllKeys(entry, [
          'id', 'label', 'protocol', 'wantAssertionSigned', 'wantResponseSigned', 'forceAuthn',
          'spEntityId', 'keyAlgorithm', 'authnContext', 'nameIdFormat', 'metadataUrl', 'disableContext'
        ])
        assert.equal(entry.protocol, 'saml')
        assert.equal(entry.label, 'example.auth0.com')
        assert.isFalse(entry.wantAssertionSigned)
        assert.isFalse(entry.wantResponseSigned)
        assert.isFalse(entry.forceAuthn)
        assert.equal(entry.spEntityId, 'urn:example:sp')
        assert.equal(entry.keyAlgorithm, 'sha256')
        assert.equal(entry.authnContext, 'urn:oasis:names:tc:SAML:2.0:ac:classes:unspecified')
        assert.equal(entry.nameIdFormat, 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress')
        assert.equal(entry.metadataUrl, 'https://example.auth0.com/samlp/metadata/ExAMpLE')
        assert.isFalse(entry.disableContext)
      } else if (entry.id === 'oidc-1') {
        assert.hasAllKeys(entry, [
          'id', 'label', 'protocol', 'clientId', 'clientSecret',
          'issuerUri', 'selectAccount', 'signingAlgo'
        ])
        assert.equal(entry.protocol, 'oidc')
        assert.equal(entry.label, 'example.google.com')
        assert.equal(entry.clientId, 'WPHyLwfzGHdC0g76CksZ4hKmqn0iIGJ3')
        assert.equal(entry.clientSecret, 'qfvb7G8Wi6fCinf010lBXsO_PaSmt')
        assert.equal(entry.issuerUri, 'https://example.google.com/')
        assert.isFalse(entry.selectAccount)
        assert.equal(entry.signingAlgo, 'RS256')
      } else if (entry.id === 'oidc-2') {
        assert.hasAllKeys(entry, [
          'id', 'label', 'protocol', 'clientId', 'clientSecret',
          'issuerUri', 'selectAccount', 'signingAlgo'
        ])
        assert.equal(entry.protocol, 'oidc')
        assert.equal(entry.label, 'Okta Example')
        assert.equal(entry.clientId, '0oa84g5ccjhTcLiPr357')
        assert.equal(entry.clientSecret, 'dIVTgYc6awmRR7iOdiWKqia')
        assert.equal(entry.issuerUri, 'https://dev-example.okta.com')
        assert.isFalse(entry.selectAccount)
        assert.equal(entry.signingAlgo, 'RS256')
      }
    }
  })

  it('should remove one of the OIDC providers', async function () {
    // arrange
    const providersBefore = await getProviders()
    assert.isArray(providersBefore)
    assert.lengthOf(providersBefore, 3)
    const provider = providersBefore.find((p) => p.label === 'Okta Example')
    // act
    const result = await deleteProvider(provider)
    assert.isArray(result)
    assert.lengthOf(result, 2)
    configuredRepository.set('AUTH_PROVIDERS', result)
    const providers = await getProviders()
    assert.isArray(providers)
    assert.lengthOf(providers, 2)
    assert.isTrue(providers.some((e) => e.id === 'saml-0'))
    assert.isTrue(providers.some((e) => e.id === 'oidc-1'))
    for (const entry of providers) {
      if (entry.label === 'example.auth0.com') {
        assert.hasAllKeys(entry, [
          'id', 'label', 'protocol', 'wantAssertionSigned', 'wantResponseSigned', 'forceAuthn',
          'spEntityId', 'keyAlgorithm', 'authnContext', 'nameIdFormat', 'metadataUrl', 'disableContext'
        ])
        assert.equal(entry.id, 'saml-0')
        assert.equal(entry.protocol, 'saml')
        assert.isFalse(entry.wantAssertionSigned)
        assert.isFalse(entry.wantResponseSigned)
        assert.isFalse(entry.forceAuthn)
        assert.equal(entry.spEntityId, 'urn:example:sp')
        assert.equal(entry.keyAlgorithm, 'sha256')
        assert.equal(entry.authnContext, 'urn:oasis:names:tc:SAML:2.0:ac:classes:unspecified')
        assert.equal(entry.nameIdFormat, 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress')
        assert.equal(entry.metadataUrl, 'https://example.auth0.com/samlp/metadata/ExAMpLE')
        assert.isFalse(entry.disableContext)
      } else if (entry.label === 'example.google.com') {
        assert.hasAllKeys(entry, [
          'id', 'label', 'protocol', 'clientId', 'clientSecret',
          'issuerUri', 'selectAccount', 'signingAlgo'
        ])
        assert.equal(entry.id, 'oidc-1')
        assert.equal(entry.protocol, 'oidc')
        assert.equal(entry.clientId, 'WPHyLwfzGHdC0g76CksZ4hKmqn0iIGJ3')
        assert.equal(entry.clientSecret, 'qfvb7G8Wi6fCinf010lBXsO_PaSmt')
        assert.equal(entry.issuerUri, 'https://example.google.com/')
        assert.isFalse(entry.selectAccount)
        assert.equal(entry.signingAlgo, 'RS256')
      }
    }
  })
})
