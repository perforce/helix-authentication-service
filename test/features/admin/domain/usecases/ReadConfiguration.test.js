//
// Copyright 2023 Perforce Software
//
import { AssertionError } from 'node:assert'
import * as fs from 'node:fs'
import { assert } from 'chai'
import { after, before, describe, it } from 'mocha'
import sinon from 'sinon'
import { temporaryFile } from 'tempy'
import { DefaultsEnvRepository } from 'helix-auth-svc/lib/common/data/repositories/DefaultsEnvRepository.js'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'
import { MergedSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MergedSettingsRepository.js'
import { ConfigurationRepository } from 'helix-auth-svc/lib/features/admin/domain/repositories/ConfigurationRepository.js'
import ReadConfiguration from 'helix-auth-svc/lib/features/admin/domain/usecases/ReadConfiguration.js'
import ValidateAuthProvider from 'helix-auth-svc/lib/features/admin/domain/usecases/ValidateAuthProvider.js'
import GetAuthProviders from 'helix-auth-svc/lib/features/login/domain/usecases/GetAuthProviders.js'
import GetSamlAuthnContext from 'helix-auth-svc/lib/features/login/domain/usecases/GetSamlAuthnContext.js'
import TidyAuthProviders from 'helix-auth-svc/lib/features/login/domain/usecases/TidyAuthProviders.js'

describe('ReadConfiguration use case', function () {
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
  const tidyAuthProviders = TidyAuthProviders({
    getSamlAuthnContext: GetSamlAuthnContext(),
    validateAuthProvider: ValidateAuthProvider()
  })
  let usecase

  before(function () {
    const configRepository = new ConfigurationRepository()
    const getIdPConfiguration = () => {
      return {
        'urn:swarm-example:sp': {
          'acsUrl': 'https://swarm.example.com'
        }
      }
    }
    const getAuthProviders = GetAuthProviders({ defaultsRepository, settingsRepository, tidyAuthProviders })
    usecase = ReadConfiguration({
      configRepository,
      temporaryRepository,
      defaultsRepository,
      getIdPConfiguration,
      getAuthProviders
    })
  })

  after(function () {
    sinon.restore()
  })

  it('should raise an error for invalid input', async function () {
    assert.throws(() => ReadConfiguration({
      configRepository: null,
      temporaryRepository: {},
      getIdPConfiguration: {},
      defaultsRepository: {},
      getAuthProviders: {}
    }), AssertionError)
    assert.throws(() => ReadConfiguration({
      configRepository: {},
      temporaryRepository: null,
      getIdPConfiguration: {},
      defaultsRepository: {},
      getAuthProviders: {}
    }), AssertionError)
    assert.throws(() => ReadConfiguration({
      configRepository: {},
      temporaryRepository: {},
      getIdPConfiguration: null,
      defaultsRepository: {},
      getAuthProviders: {}
    }), AssertionError)
    assert.throws(() => ReadConfiguration({
      configRepository: {},
      temporaryRepository: {},
      getIdPConfiguration: {},
      defaultsRepository: null,
      getAuthProviders: {}
    }), AssertionError)
    assert.throws(() => ReadConfiguration({
      configRepository: {},
      temporaryRepository: {},
      getIdPConfiguration: {},
      defaultsRepository: {},
      getAuthProviders: null
    }), AssertionError)
  })

  it('should read values from the repository', async function () {
    // arrange
    const readStub = sinon.stub(ConfigurationRepository.prototype, 'read').callsFake(() => {
      const results = new Map()
      results.set('NAME1', 'VALUE1')
      results.set('ADMIN_ENABLED', true)
      results.set('ADMIN_USERNAME', 'scott')
      results.set('ADMIN_PASSWD_FILE', '/etc/passwd')
      results.set('ADMIN_P4_AUTH', true)
      results.set('OAUTH_SIGNING_KEY_FILE', 'package.json')
      results.set('PFX_FILE', 'package.json')
      return results
    })
    try {
      // act
      const settings = await usecase()
      // assert
      assert.lengthOf(settings, 11)
      assert.equal(settings.get('NAME1'), 'VALUE1')
      assert.isUndefined(settings.get('ADMIN_USERNAME'))
      assert.isFalse(settings.has('KEY'))
      assert.isFalse(settings.has('OAUTH_SIGNING_KEY'))
      assert.isFalse(settings.has('PFX'))
      assert.isFalse(settings.has('REDIS_KEY'))
      assert.isTrue(settings.has('AUTH_PROVIDERS'))
      const providers = settings.get('AUTH_PROVIDERS')
      assert.lengthOf(providers, 0)
      assert.equal(settings.get('TOKEN_TTL'), '3600')
      assert.isTrue(readStub.calledOnce)
    } finally {
      readStub.restore()
    }
  })

  it('should merge with temporary repository', async function () {
    // arrange
    const readStub = sinon.stub(ConfigurationRepository.prototype, 'read').callsFake(() => {
      const results = new Map()
      results.set('NAME1', 'VALUE1')
      results.set('NAME2', 'VALUE2')
      return results
    })
    temporaryRepository.set('NAME1', 'TVALUE1')
    temporaryRepository.set('NAME3', 'TVALUE3')
    try {
      // act
      const settings = await usecase()
      // assert
      assert.equal(settings.get('NAME1'), 'TVALUE1')
      assert.equal(settings.get('NAME2'), 'VALUE2')
      assert.equal(settings.get('NAME3'), 'TVALUE3')
      assert.isTrue(readStub.calledOnce)
    } finally {
      readStub.restore()
      temporaryRepository.clear()
    }
  })

  it('should rename old settings to new names', async function () {
    // arrange
    const certFile = temporaryFile({ extension: 'crt' })
    fs.writeFileSync(certFile, '-----BEGIN CERTIFICATE-----')
    const keyFile = temporaryFile({ extension: 'key' })
    fs.writeFileSync(keyFile, '-----BEGIN PRIVATE KEY-----')
    const readStub = sinon.stub(ConfigurationRepository.prototype, 'read').callsFake(() => {
      const results = new Map()
      //
      // These settings get renamed by EnvSettingsRepository at startup which
      // makes testing of both this case case and the getAuthProvider more
      // difficult than it should be.
      //
      // results.set('SAML_SP_ISSUER', 'spIssuer')
      // results.set('SAML_IDP_ISSUER', 'idpIssuer')
      results.set('SP_CERT_FILE', certFile)
      results.set('SP_KEY_FILE', keyFile)
      return results
    })
    try {
      // act
      const settings = await usecase()
      // assert
      assert.lengthOf(settings, 10)
      const providers = settings.get('AUTH_PROVIDERS')
      assert.lengthOf(providers, 0)
      assert.equal(settings.get('CERT'), '-----BEGIN CERTIFICATE-----')
      assert.isTrue(readStub.calledOnce)
    } finally {
      readStub.restore()
      temporaryRepository.clear()
    }
  })

  it('should generate labels for converted providers', async function () {
    // arrange
    const readStub = sinon.stub(ConfigurationRepository.prototype, 'read').callsFake(() => {
      return new Map()
    })
    // getAuthProviders is reading from the merged repository
    temporaryRepository.set('SAML_IDP_METADATA_FILE', 'test/fixtures/idp-metadata.xml')
    temporaryRepository.set('OIDC_ISSUER_URI', 'https://oidc.example.com:8080/issuer')
    temporaryRepository.set('OIDC_CLIENT_ID', 'client-id')
    temporaryRepository.set('OIDC_CLIENT_SECRET', 'client-secret')
    try {
      // act
      const settings = await usecase()
      // assert
      assert.lengthOf(settings, 10)
      const providers = settings.get('AUTH_PROVIDERS')
      assert.lengthOf(providers, 2)
      // providers sorted by label...
      assert.equal(providers[1]['protocol'], 'oidc')
      assert.equal(providers[1]['label'], 'oidc.example.com')
      assert.equal(providers[0]['protocol'], 'saml')
      assert.equal(providers[0]['label'], 'https://shibboleth.doc:4443/idp/shibboleth')
      assert.isTrue(readStub.calledOnce)
    } finally {
      readStub.restore()
      temporaryRepository.clear()
    }
  })

  it('should return defined labels for converted providers', async function () {
    // arrange
    const readStub = sinon.stub(ConfigurationRepository.prototype, 'read').callsFake(() => {
      return new Map()
    })
    // getAuthProviders is reading from the merged repository
    temporaryRepository.set('SAML_IDP_ENTITY_ID', 'idpIssuerId')
    temporaryRepository.set('SAML_IDP_SSO_URL', 'https://saml.example.com/saml/sso')
    temporaryRepository.set('SAML_INFO_LABEL', 'Security Provider')
    temporaryRepository.set('OIDC_ISSUER_URI', 'https://oidc.example.com:8080/issuer')
    temporaryRepository.set('OIDC_INFO_LABEL', 'OpenID Provider')
    temporaryRepository.set('OIDC_CLIENT_ID', 'client-id')
    temporaryRepository.set('OIDC_CLIENT_SECRET', 'client-secret')
    try {
      // act
      const settings = await usecase()
      // assert
      assert.lengthOf(settings, 10)
      const providers = settings.get('AUTH_PROVIDERS')
      assert.lengthOf(providers, 2)
      assert.equal(providers[0]['protocol'], 'oidc')
      assert.equal(providers[1]['protocol'], 'saml')
      assert.equal(providers[0]['label'], 'OpenID Provider')
      assert.equal(providers[1]['label'], 'Security Provider')
      assert.isTrue(readStub.calledOnce)
    } finally {
      readStub.restore()
      temporaryRepository.clear()
    }
  })

  it('should ignore nearly empty providers with default config', async function () {
    // arrange
    const readStub = sinon.stub(ConfigurationRepository.prototype, 'read').callsFake(() => {
      return new Map()
    })
    try {
      // act
      const settings = await usecase()
      // assert
      assert.lengthOf(settings, 10)
      const providers = settings.get('AUTH_PROVIDERS')
      assert.lengthOf(providers, 0)
      assert.isTrue(readStub.calledOnce)
    } finally {
      readStub.restore()
    }
  })

  it('should delete old settings if new names are present', async function () {
    // arrange
    const certFile = temporaryFile({ extension: 'crt' })
    fs.writeFileSync(certFile, '-----BEGIN CERTIFICATE-----')
    const keyFile = temporaryFile({ extension: 'key' })
    fs.writeFileSync(keyFile, '-----BEGIN PRIVATE KEY-----')
    const readStub = sinon.stub(ConfigurationRepository.prototype, 'read').callsFake(() => {
      const results = new Map()
      results.set('CERT_FILE', certFile)
      results.set('KEY_FILE', keyFile)
      results.set('SP_CERT_FILE', 'oldcert')
      results.set('SP_KEY_FILE', 'oldkey')
      return results
    })
    // getAuthProviders is reading from the merged repository
    temporaryRepository.set('SAML_SP_ENTITY_ID', 'spIssuer')
    temporaryRepository.set('SAML_IDP_ENTITY_ID', 'idpIssuer')
    temporaryRepository.set('SAML_IDP_SSO_URL', 'https://saml.example.com/saml/sso')
    temporaryRepository.set('SAML_SP_ISSUER', 'oldSpIssuer')
    temporaryRepository.set('SAML_IDP_ISSUER', 'oldIdpIssuer')
    try {
      // act
      const settings = await usecase()
      // assert
      assert.lengthOf(settings, 10)
      assert.isFalse(settings.has('SP_CERT_FILE'))
      assert.isFalse(settings.has('SP_KEY_FILE'))
      assert.equal(settings.get('CERT'), '-----BEGIN CERTIFICATE-----')
      const providers = settings.get('AUTH_PROVIDERS')
      assert.lengthOf(providers, 1)
      assert.equal(providers[0]['protocol'], 'saml')
      // old names take precedence over new names (for provider settings)
      assert.equal(providers[0]['spEntityId'], 'spIssuer')
      assert.equal(providers[0]['idpEntityId'], 'idpIssuer')
      assert.equal(providers[0]['label'], 'idpIssuer')
      assert.isTrue(readStub.calledOnce)
    } finally {
      readStub.restore()
      temporaryRepository.clear()
    }
  })

  it('should read secrets from files into settings', async function () {
    // arrange
    const secretFile = temporaryFile({ extension: 'txt' })
    fs.writeFileSync(secretFile, 'tiger')
    const passwdFile = temporaryFile({ extension: 'txt' })
    fs.writeFileSync(passwdFile, 'housecat')
    const readStub = sinon.stub(ConfigurationRepository.prototype, 'read').callsFake(() => {
      const results = new Map()
      results.set('KEY_PASSPHRASE_FILE', passwdFile)
      return results
    })
    temporaryRepository.set('OIDC_ISSUER_URI', 'https://oidc.example.com:8080/issuer')
    temporaryRepository.set('OIDC_INFO_LABEL', 'OpenID Provider')
    temporaryRepository.set('OIDC_CLIENT_ID', 'client-id')
    temporaryRepository.set('OIDC_CLIENT_SECRET_FILE', secretFile)
    try {
      // act
      const settings = await usecase()
      // assert
      assert.lengthOf(settings, 11)
      assert.equal(settings.get('KEY_PASSPHRASE'), 'housecat')
      assert.isFalse(settings.has('KEY_PASSPHRASE_FILE'))
      const providers = settings.get('AUTH_PROVIDERS')
      assert.equal(providers[0]['clientSecret'], 'tiger')
      assert.notProperty(providers[0], 'clientSecretFile')
      assert.isTrue(readStub.calledOnce)
    } finally {
      readStub.restore()
      temporaryRepository.clear()
    }
  })

  it('should read certificates from files into settings', async function () {
    // arrange
    const caCertFile = temporaryFile({ extension: 'pem' })
    fs.writeFileSync(caCertFile, '-----BEGIN AUTHORITY-----')
    const certFile = temporaryFile({ extension: 'crt' })
    fs.writeFileSync(certFile, '-----BEGIN CERTIFICATE-----')
    const keyFile = temporaryFile({ extension: 'key' })
    fs.writeFileSync(keyFile, '-----BEGIN PRIVATE KEY-----')
    const readStub = sinon.stub(ConfigurationRepository.prototype, 'read').callsFake(() => {
      const results = new Map()
      results.set('CA_CERT_FILE', caCertFile)
      results.set('CERT_FILE', certFile)
      results.set('KEY_FILE', keyFile)
      return results
    })
    try {
      // act
      const settings = await usecase()
      // assert
      assert.lengthOf(settings, 11)
      assert.equal(settings.get('CA_CERT'), '-----BEGIN AUTHORITY-----')
      assert.isFalse(settings.has('CA_CERT_FILE'))
      assert.equal(settings.get('CERT'), '-----BEGIN CERTIFICATE-----')
      assert.isFalse(settings.has('CERT_FILE'))
      assert.isFalse(settings.has('KEY'))
      assert.isFalse(settings.has('KEY_FILE'))
      assert.isTrue(readStub.calledOnce)
    } finally {
      readStub.restore()
    }
  })

  it('should read auth providers from setting', async function () {
    // arrange
    const providers = {
      providers: [{
        metadataUrl: 'https://saml.example.com/idp/metadata',
        label: 'Acme Identity',
        protocol: 'saml'
      }]
    }
    const readStub = sinon.stub(ConfigurationRepository.prototype, 'read').callsFake(() => {
      return new Map()
    })
    temporaryRepository.set('AUTH_PROVIDERS', JSON.stringify(providers))
    try {
      // act
      const settings = await usecase()
      // assert
      assert.lengthOf(settings, 10)
      assert.isTrue(settings.has('AUTH_PROVIDERS'))
      const actual = settings.get('AUTH_PROVIDERS')
      assert.lengthOf(actual, 1)
      assert.property(actual[0], 'label')
      assert.equal(actual[0].label, 'Acme Identity')
      assert.equal(actual[0].protocol, 'saml')
      assert.isTrue(readStub.calledOnce)
    } finally {
      readStub.restore()
      temporaryRepository.clear()
    }
  })

  it('should read authnContext from classic settings', async function () {
    // arrange
    const contexts = [
      'urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport',
      'urn:oasis:names:tc:SAML:2.0:ac:classes:Kerberos',
      'urn:oasis:names:tc:SAML:2.0:ac:classes:Password'
    ]
    const authnContext = contexts.map((e) => `"${e}"`).join()
    const readStub = sinon.stub(ConfigurationRepository.prototype, 'read').callsFake(() => {
      return new Map()
    })
    temporaryRepository.set('SAML_IDP_METADATA_URL', 'https://saml.example.com/idp/metadata')
    temporaryRepository.set('SAML_AUTHN_CONTEXT', `[${authnContext}]`)
    temporaryRepository.set('SAML_INFO_LABEL', 'Acme Identity')
    try {
      // act
      const settings = await usecase()
      // assert
      assert.lengthOf(settings, 10)
      assert.isTrue(settings.has('AUTH_PROVIDERS'))
      const actual = settings.get('AUTH_PROVIDERS')
      assert.lengthOf(actual, 1)
      assert.property(actual[0], 'label')
      assert.equal(actual[0].label, 'Acme Identity')
      assert.equal(actual[0].protocol, 'saml')
      assert.isArray(actual[0].authnContext)
      assert.lengthOf(actual[0].authnContext, 3)
      assert.deepEqual(actual[0].authnContext, contexts)
      assert.isTrue(readStub.calledOnce)
    } finally {
      readStub.restore()
      temporaryRepository.clear()
    }
  })

  it('should read auth providers with authnContext', async function () {
    // arrange
    const contexts = [
      'urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport',
      'urn:oasis:names:tc:SAML:2.0:ac:classes:Kerberos',
      'urn:oasis:names:tc:SAML:2.0:ac:classes:Password'
    ]
    const providers = {
      providers: [{
        metadataUrl: 'https://saml.example.com/idp/metadata',
        authnContext: contexts,
        label: 'Acme Identity',
        protocol: 'saml'
      }]
    }
    const readStub = sinon.stub(ConfigurationRepository.prototype, 'read').callsFake(() => {
      return new Map()
    })
    temporaryRepository.set('AUTH_PROVIDERS', JSON.stringify(providers))
    try {
      // act
      const settings = await usecase()
      // assert
      assert.lengthOf(settings, 10)
      assert.isTrue(settings.has('AUTH_PROVIDERS'))
      const actual = settings.get('AUTH_PROVIDERS')
      assert.lengthOf(actual, 1)
      assert.property(actual[0], 'label')
      assert.equal(actual[0].label, 'Acme Identity')
      assert.equal(actual[0].protocol, 'saml')
      assert.isArray(actual[0].authnContext)
      assert.lengthOf(actual[0].authnContext, 3)
      assert.deepEqual(actual[0].authnContext, contexts)
      assert.isTrue(readStub.calledOnce)
    } finally {
      readStub.restore()
      temporaryRepository.clear()
    }
  })

  it('should read auth providers from file', async function () {
    // arrange
    const providersFile = temporaryFile({ extension: 'json' })
    const providers = {
      providers: [{
        metadataUrl: 'https://saml.example.com/idp/metadata',
        label: 'Acme Identity',
        protocol: 'saml'
      }]
    }
    fs.writeFileSync(providersFile, JSON.stringify(providers))
    const readStub = sinon.stub(ConfigurationRepository.prototype, 'read').callsFake(() => {
      const results = new Map()
      return results
    })
    temporaryRepository.set('AUTH_PROVIDERS_FILE', providersFile)
    // act
    const settings = await usecase()
    // assert
    try {
      assert.lengthOf(settings, 10)
      assert.isFalse(settings.has('AUTH_PROVIDERS_FILE'))
      assert.isTrue(settings.has('AUTH_PROVIDERS'))
      const actual = settings.get('AUTH_PROVIDERS')
      assert.lengthOf(actual, 1)
      assert.property(actual[0], 'label')
      assert.equal(actual[0].label, 'Acme Identity')
      assert.equal(actual[0].protocol, 'saml')
      assert.isTrue(readStub.calledOnce)
    } finally {
      readStub.restore()
      temporaryRepository.clear()
    }
  })

  it('should read IdP configuration into settings', async function () {
    // arrange
    const readStub = sinon.stub(ConfigurationRepository.prototype, 'read').callsFake(() => {
      const results = new Map()
      results.set('IDP_CONFIG_FILE', 'routes/samlidp.cjs')
      return results
    })
    try {
      // act
      const settings = await usecase()
      // assert
      assert.lengthOf(settings, 10)
      assert.isFalse(settings.has('IDP_CONFIG_FILE'))
      assert.isTrue(settings.has('IDP_CONFIG'))
      const idpConfig = settings.get('IDP_CONFIG')
      assert.property(idpConfig, 'urn:swarm-example:sp')
      assert.isTrue(readStub.calledOnce)
    } finally {
      readStub.restore()
    }
  })

  it('should read IdP metadata from file', async function () {
    // arrange
    const readStub = sinon.stub(ConfigurationRepository.prototype, 'read').callsFake(() => {
      return new Map()
    })
    temporaryRepository.set('SAML_IDP_METADATA_FILE', 'test/fixtures/idp-metadata.xml')
    try {
      // act
      const settings = await usecase()
      // assert
      assert.lengthOf(settings, 10)
      const actual = settings.get('AUTH_PROVIDERS')
      assert.lengthOf(actual, 1)
      assert.equal(actual[0]['protocol'], 'saml')
      assert.property(actual[0], 'metadata')
      assert.equal(actual[0]['label'], 'https://shibboleth.doc:4443/idp/shibboleth')
      assert.isTrue(readStub.calledOnce)
    } finally {
      readStub.restore()
      temporaryRepository.clear()
    }
  })
})
