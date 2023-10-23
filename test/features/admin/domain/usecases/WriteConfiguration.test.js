//
// Copyright 2023 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { after, before, describe, it } from 'mocha'
import sinon from 'sinon'
import { DefaultsEnvRepository } from 'helix-auth-svc/lib/common/data/repositories/DefaultsEnvRepository.js'
import { ConfigurationRepository } from 'helix-auth-svc/lib/common/domain/repositories/ConfigurationRepository.js'
import ConvertFromProviders from 'helix-auth-svc/lib/features/admin/domain/usecases/ConvertFromProviders.js'
import CleanAuthProviders from 'helix-auth-svc/lib/features/admin/domain/usecases/CleanAuthProviders.js'
import WriteConfiguration from 'helix-auth-svc/lib/features/admin/domain/usecases/WriteConfiguration.js'
import ValidateAuthProvider from 'helix-auth-svc/lib/features/admin/domain/usecases/ValidateAuthProvider.js'
import GetSamlAuthnContext from 'helix-auth-svc/lib/features/login/domain/usecases/GetSamlAuthnContext.js'
import TidyAuthProviders from 'helix-auth-svc/lib/features/login/domain/usecases/TidyAuthProviders.js'

describe('WriteConfiguration use case', function () {
  let usecase

  before(function () {
    const configurationRepository = new ConfigurationRepository()
    const defaultsRepository = new DefaultsEnvRepository()
    const validateAuthProvider = ValidateAuthProvider()
    const cleanAuthProviders = CleanAuthProviders({ defaultsRepository })
    const convertFromProviders = ConvertFromProviders({
      tidyAuthProviders: TidyAuthProviders({
        getSamlAuthnContext: GetSamlAuthnContext(),
        validateAuthProvider
      }),
      validateAuthProvider
    })
    usecase = WriteConfiguration({
      configurationRepository,
      defaultsRepository,
      convertFromProviders,
      cleanAuthProviders
    })
  })

  after(function () {
    sinon.restore()
  })

  it('should raise an error for invalid input', async function () {
    assert.throws(() => WriteConfiguration({
      configurationRepository: null,
      defaultsRepository: {},
      convertFromProviders: {}
    }), AssertionError)
    assert.throws(() => WriteConfiguration({
      configurationRepository: {},
      defaultsRepository: null,
      convertFromProviders: {}
    }), AssertionError)
    assert.throws(() => WriteConfiguration({
      configurationRepository: {},
      defaultsRepository: {},
      convertFromProviders: null
    }), AssertionError)
  })

  it('should write values to the repository', async function () {
    // arrange
    const readStub = sinon.stub(ConfigurationRepository.prototype, 'read').callsFake(() => {
      const results = new Map()
      results.set('NAME1', 'VALUE1')
      results.set('NAME3', 'VALUE3')
      results.set('ADMIN_ENABLED', true)
      results.set('ADMIN_USERNAME', 'scott')
      results.set('ADMIN_PASSWD_FILE', '/etc/passwd')
      results.set('ADMIN_P4_AUTH', 'false')
      return results
    })
    const writeStub = sinon.stub(ConfigurationRepository.prototype, 'write').callsFake((settings) => {
      assert.isDefined(settings)
      assert.lengthOf(settings, 7)
      assert.equal(settings.get('NAME1'), 'VALUE1')
      assert.equal(settings.get('NAME2'), 'VALUE2')
      assert.equal(settings.get('NAME3'), 'VALUE#3')
      assert.isTrue(settings.get('ADMIN_ENABLED'))
      assert.equal(settings.get('ADMIN_USERNAME'), 'scott')
      assert.equal(settings.get('ADMIN_PASSWD_FILE'), '/etc/passwd')
      assert.equal(settings.get('ADMIN_P4_AUTH'), 'false')
    })
    // act
    const settings = new Map()
    settings.set('NAME2', 'VALUE2')
    settings.set('NAME3', 'VALUE#3')
    settings.set('ADMIN_ENABLED', false)
    settings.set('ADMIN_USERNAME', 'charlie')
    settings.set('ADMIN_PASSWD_FILE', '/etc/shadow')
    settings.set('ADMIN_P4_AUTH', 'true')
    await usecase(settings)
    // assert
    assert.isTrue(readStub.calledOnce)
    assert.isTrue(writeStub.calledOnce)
    readStub.restore()
    writeStub.restore()
  })

  it('should completely remove empty values', async function () {
    // arrange
    const readStub = sinon.stub(ConfigurationRepository.prototype, 'read').callsFake(() => {
      const results = new Map()
      results.set('NAME1', 'VALUE1')
      results.set('NAME3', 'VALUE3')
      results.set('ADMIN_ENABLED', true)
      results.set('ADMIN_USERNAME', 'scott')
      results.set('ADMIN_PASSWD_FILE', '/etc/passwd')
      return results
    })
    const writeStub = sinon.stub(ConfigurationRepository.prototype, 'write').callsFake((settings) => {
      assert.isDefined(settings)
      assert.lengthOf(settings, 5)
      assert.equal(settings.get('NAME1'), 'VALUE1')
      assert.equal(settings.get('NAME2'), 'VALUE2')
      assert.isFalse(settings.has('NAME3'))
      assert.isTrue(settings.get('ADMIN_ENABLED'))
      assert.equal(settings.get('ADMIN_USERNAME'), 'scott')
      assert.equal(settings.get('ADMIN_PASSWD_FILE'), '/etc/passwd')
    })
    // act
    const settings = new Map()
    settings.set('NAME2', 'VALUE2')
    settings.set('NAME3', '')
    settings.set('ADMIN_ENABLED', false)
    settings.set('ADMIN_USERNAME', 'charlie')
    settings.set('ADMIN_PASSWD_FILE', '/etc/shadow')
    await usecase(settings)
    // assert
    assert.isTrue(readStub.calledOnce)
    assert.isTrue(writeStub.calledOnce)
    readStub.restore()
    writeStub.restore()
  })

  it('should remove settings with old names', async function () {
    // arrange
    const readStub = sinon.stub(ConfigurationRepository.prototype, 'read').callsFake(() => {
      const results = new Map()
      results.set('SAML_SP_ISSUER', 'spIssuer')
      results.set('SAML_IDP_ISSUER', 'idpIssuer')
      results.set('SP_CERT_FILE', 'cert.pem')
      results.set('SP_KEY_FILE', 'key.pem')
      return results
    })
    const writeStub = sinon.stub(ConfigurationRepository.prototype, 'write').callsFake((settings) => {
      assert.isDefined(settings)
      assert.lengthOf(settings, 4)
      assert.equal(settings.get('SAML_SP_ENTITY_ID'), 'spIssuer')
      assert.equal(settings.get('SAML_IDP_ENTITY_ID'), 'idpIssuer')
      // CERT_FILE is accepted and the old setting is removed
      assert.equal(settings.get('CERT_FILE'), 'cert.pem')
      // meanwhile, KEY_FILE is blocked and hence the old setting remains
      assert.equal(settings.get('SP_KEY_FILE'), 'key.pem')
    })
    // act
    const settings = new Map()
    settings.set('SAML_SP_ENTITY_ID', 'spIssuer')
    settings.set('SAML_IDP_ENTITY_ID', 'idpIssuer')
    settings.set('CERT_FILE', 'cert.pem')
    settings.set('KEY_FILE', 'key.pem')
    try {
      await usecase(settings)
      // assert
      assert.isTrue(readStub.calledOnce)
      assert.isTrue(writeStub.calledOnce)
    } finally {
      readStub.restore()
      writeStub.restore()
    }
  })

  it('should convert auth providers to original settings', async function () {
    // arrange
    const readStub = sinon.stub(ConfigurationRepository.prototype, 'read').callsFake(() => {
      const settings = new Map()
      // incoming providers will wipe out these settings
      settings.set('SAML_IDP_SLO_URL', 'https://saml/logout')
      return settings
    })
    const writeStub = sinon.stub(ConfigurationRepository.prototype, 'write').callsFake((settings) => {
      assert.isDefined(settings)
      assert.lengthOf(settings, 4)
      // raw IdP cert is converted to a file
      assert.isTrue(settings.has('IDP_CERT'))
      assert.equal(settings.get('IDP_CERT'), '-----BEGIN CERTIFICATE-----')
      assert.equal(settings.get('SAML_IDP_METADATA_URL'), 'https://saml.acme.net')
      assert.equal(settings.get('SAML_INFO_LABEL'), 'Acme Identity')
      assert.equal(settings.get('SAML_SP_ENTITY_ID'), 'urn:example:sp')
    })
    // act
    const settings = new Map()
    const providers = [{
      label: 'Acme Identity',
      protocol: 'saml',
      metadataUrl: 'https://saml.acme.net',
      spEntityId: 'urn:example:sp',
      idpCert: '-----BEGIN CERTIFICATE-----'
    }]
    settings.set('AUTH_PROVIDERS', providers)
    try {
      await usecase(settings)
      // assert
      assert.isTrue(readStub.calledOnce)
      assert.isTrue(writeStub.calledOnce)
    } finally {
      readStub.restore()
      writeStub.restore()
    }
  })

  it('should convert authnContext to string for classic', async function () {
    // arrange
    const contexts = [
      'urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport',
      'urn:oasis:names:tc:SAML:2.0:ac:classes:Kerberos',
      'urn:oasis:names:tc:SAML:2.0:ac:classes:Password'
    ]
    const authnContext = '[' + contexts.map((e) => `"${e}"`).join() + ']'
    const readStub = sinon.stub(ConfigurationRepository.prototype, 'read').callsFake(() => {
      return new Map()
    })
    const writeStub = sinon.stub(ConfigurationRepository.prototype, 'write').callsFake((settings) => {
      assert.isDefined(settings)
      assert.lengthOf(settings, 3)
      assert.equal(settings.get('SAML_IDP_METADATA_URL'), 'https://saml.acme.net')
      assert.equal(settings.get('SAML_INFO_LABEL'), 'Acme Identity')
      assert.equal(settings.get('SAML_AUTHN_CONTEXT'), authnContext)
    })
    // act
    const settings = new Map()
    const providers = [{
      label: 'Acme Identity',
      protocol: 'saml',
      metadataUrl: 'https://saml.acme.net',
      authnContext: contexts
    }]
    settings.set('AUTH_PROVIDERS', providers)
    try {
      await usecase(settings)
      // assert
      assert.isTrue(readStub.calledOnce)
      assert.isTrue(writeStub.calledOnce)
    } finally {
      readStub.restore()
      writeStub.restore()
    }
  })

  it('should filter defaults from auth providers', async function () {
    // arrange
    const readStub = sinon.stub(ConfigurationRepository.prototype, 'read').callsFake(() => {
      return new Map()
    })
    const writeStub = sinon.stub(ConfigurationRepository.prototype, 'write').callsFake((settings) => {
      assert.isDefined(settings)
      assert.lengthOf(settings, 1)
      assert.isTrue(settings.has('AUTH_PROVIDERS'))
      const providers = settings.get('AUTH_PROVIDERS')
      assert.equal(providers[0].label, 'Acme Identity')
      assert.equal(providers[0].protocol, 'saml')
      assert.equal(providers[0].metadataUrl, 'https://saml1.example.com')
      assert.notProperty(providers[0], 'id')
      assert.notProperty(providers[0], 'wantAssertionSigned')
      assert.notProperty(providers[0], 'wantResponseSigned')
      assert.notProperty(providers[0], 'spEntityId')
      assert.notProperty(providers[0], 'keyAlgorithm')
      assert.notProperty(providers[0], 'authnContext')
      assert.notProperty(providers[0], 'nameIdFormat')
      assert.equal(providers[2].label, 'Pong Anonymous')
      assert.equal(providers[2].protocol, 'oidc')
      assert.equal(providers[2].issuerUri, 'https://oidc1.example.com')
      assert.equal(providers[2].clientId, 'client-id')
      assert.equal(providers[2].clientSecret, 'client-secret')
      assert.notProperty(providers[2], 'id')
      assert.notProperty(providers[2], 'selectAccount')
      assert.notProperty(providers[2], 'signingAlgo')
    })
    // act
    const settings = new Map()
    const providers = [{
      label: 'Acme Identity',
      protocol: 'saml',
      id: 'saml-0',
      metadataUrl: 'https://saml1.example.com',
      wantAssertionSigned: true,
      wantResponseSigned: true,
      spEntityId: 'https://has.example.com',
      keyAlgorithm: 'sha256',
      authnContext: 'urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport',
      nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified'
    }, {
      label: 'Coyote Security',
      protocol: 'saml',
      id: 'saml-1',
      metadataUrl: 'https://saml2.example.com'
    }, {
      label: 'Pong Anonymous',
      protocol: 'oidc',
      id: 'oidc-0',
      issuerUri: 'https://oidc1.example.com',
      clientId: 'client-id',
      clientSecret: 'client-secret',
      selectAccount: false,
      signingAlgo: 'RS256'
    }, {
      label: 'Veritas Solutions',
      protocol: 'oidc',
      id: 'oidc-1',
      issuerUri: 'https://oidc2.example.com',
      clientId: 'client-id',
      clientSecret: 'client-secret'
    }]
    settings.set('AUTH_PROVIDERS', providers)
    try {
      await usecase(settings)
      // assert
      assert.isTrue(readStub.calledOnce)
      assert.isTrue(writeStub.calledOnce)
    } finally {
      readStub.restore()
      writeStub.restore()
    }
  })

  it('should filter unmodified default settings', async function () {
    // arrange
    const readStub = sinon.stub(ConfigurationRepository.prototype, 'read').callsFake(() => {
      return new Map()
    })
    const writeStub = sinon.stub(ConfigurationRepository.prototype, 'write').callsFake((settings) => {
      assert.isDefined(settings)
      assert.lengthOf(settings, 1)
      assert.equal(settings.get('CACHE_TTL'), 600)
    })
    // act
    const settings = new Map()
    settings.set('LOGIN_TIMEOUT', 60)
    settings.set('OIDC_SELECT_ACCOUNT', false)
    settings.set('OIDC_TOKEN_SIGNING_ALGO', 'RS256')
    settings.set('SAML_WANT_ASSERTION_SIGNED', true)
    settings.set('SAML_WANT_RESPONSE_SIGNED', true)
    settings.set('CACHE_TTL', 600)
    await usecase(settings)
    // assert
    assert.isTrue(readStub.calledOnce)
    assert.isTrue(writeStub.calledOnce)
    readStub.restore()
    writeStub.restore()
  })
})
