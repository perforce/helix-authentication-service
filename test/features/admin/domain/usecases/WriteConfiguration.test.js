//
// Copyright 2022 Perforce Software
//
import { AssertionError } from 'node:assert'
import * as fs from 'node:fs'
import { assert } from 'chai'
import { after, before, describe, it } from 'mocha'
import sinon from 'sinon'
import { temporaryFile } from 'tempy'
import { ConfigurationRepository } from 'helix-auth-svc/lib/features/admin/domain/repositories/ConfigurationRepository.js'
import ConvertFromProviders from 'helix-auth-svc/lib/features/admin/domain/usecases/ConvertFromProviders.js'
import WriteConfiguration from 'helix-auth-svc/lib/features/admin/domain/usecases/WriteConfiguration.js'

describe('WriteConfiguration use case', function () {
  let usecase

  before(function () {
    const configRepository = new ConfigurationRepository()
    const convertFromProviders = ConvertFromProviders()
    usecase = WriteConfiguration({ configRepository, convertFromProviders })
  })

  after(function () {
    sinon.restore()
  })

  it('should raise an error for invalid input', async function () {
    assert.throws(() => WriteConfiguration({ configRepository: null, convertFromProviders: {} }), AssertionError)
    assert.throws(() => WriteConfiguration({ configRepository: {}, convertFromProviders: null }), AssertionError)
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
      assert.equal(settings.get('CERT_FILE'), 'cert.pem')
      assert.equal(settings.get('KEY_FILE'), 'key.pem')
    })
    // act
    const settings = new Map()
    settings.set('SAML_SP_ENTITY_ID', 'spIssuer')
    settings.set('SAML_IDP_ENTITY_ID', 'idpIssuer')
    settings.set('CERT_FILE', 'cert.pem')
    settings.set('KEY_FILE', 'key.pem')
    await usecase(settings)
    // assert
    assert.isTrue(readStub.calledOnce)
    assert.isTrue(writeStub.calledOnce)
    readStub.restore()
    writeStub.restore()
  })

  it('should write certs and keys into files', async function () {
    // arrange
    const readStub = sinon.stub(ConfigurationRepository.prototype, 'read').callsFake(() => {
      return new Map()
    })
    const writeStub = sinon.stub(ConfigurationRepository.prototype, 'write').callsFake((settings) => {
      assert.isDefined(settings)
      assert.lengthOf(settings, 1)
      assert.isTrue(settings.has('CA_CERT_FILE'))
      const certFile = settings.get('CA_CERT_FILE')
      const certificate = fs.readFileSync(certFile, 'utf8')
      assert.equal(certificate, '-----BEGIN CERTIFICATE-----')
      fs.rmSync(certFile)
    })
    // act
    const settings = new Map()
    settings.set('CA_CERT', '-----BEGIN CERTIFICATE-----')
    await usecase(settings)
    // assert
    assert.isTrue(readStub.calledOnce)
    assert.isTrue(writeStub.calledOnce)
    readStub.restore()
    writeStub.restore()
  })

  it('should write secrets to files if appropriate', async function () {
    // arrange
    const secretFile = temporaryFile({ extension: 'txt' })
    fs.writeFileSync(secretFile, 'lioness')
    const readStub = sinon.stub(ConfigurationRepository.prototype, 'read').callsFake(() => {
      const results = new Map()
      results.set('OIDC_CLIENT_SECRET_FILE', secretFile)
      return results
    })
    const writeStub = sinon.stub(ConfigurationRepository.prototype, 'write').callsFake((settings) => {
      assert.isDefined(settings)
      assert.lengthOf(settings, 2)
      assert.isFalse(settings.has('KEY_PASSPHRASE_FILE'))
      assert.equal(settings.get('KEY_PASSPHRASE'), 'housecat')
      assert.isTrue(settings.has('OIDC_CLIENT_SECRET_FILE'))
      assert.isFalse(settings.has('OIDC_CLIENT_SECRET'))
    })
    // act
    const settings = new Map()
    settings.set('OIDC_CLIENT_SECRET', 'tiger')
    settings.set('KEY_PASSPHRASE', 'housecat')
    await usecase(settings)
    // assert
    const secret = fs.readFileSync(secretFile, 'utf8')
    assert.equal(secret, 'tiger')
    assert.isTrue(readStub.calledOnce)
    assert.isTrue(writeStub.calledOnce)
    readStub.restore()
    writeStub.restore()
  })

  it('should write secrets only if different', async function () {
    // arrange
    const secretFile = temporaryFile({ extension: 'txt' })
    fs.writeFileSync(secretFile, 'lioness\n')
    const readStub = sinon.stub(ConfigurationRepository.prototype, 'read').callsFake(() => {
      const results = new Map()
      results.set('OIDC_CLIENT_SECRET_FILE', secretFile)
      return results
    })
    const writeStub = sinon.stub(ConfigurationRepository.prototype, 'write').callsFake((settings) => {
      assert.isDefined(settings)
      assert.lengthOf(settings, 1)
      assert.isTrue(settings.has('OIDC_CLIENT_SECRET_FILE'))
      assert.isFalse(settings.has('OIDC_CLIENT_SECRET'))
    })
    // act
    const settings = new Map()
    settings.set('OIDC_CLIENT_SECRET', 'lioness') // note missing trailing newline
    await usecase(settings)
    // assert
    const secret = fs.readFileSync(secretFile, 'utf8')
    assert.equal(secret, 'lioness\n')
    assert.isTrue(readStub.calledOnce)
    assert.isTrue(writeStub.calledOnce)
    readStub.restore()
    writeStub.restore()
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
      assert.isTrue(settings.has('IDP_CERT_FILE'))
      const certFile = settings.get('IDP_CERT_FILE')
      const certificate = fs.readFileSync(certFile, 'utf8')
      assert.equal(certificate, '-----BEGIN CERTIFICATE-----')
      assert.equal(settings.get('SAML_IDP_METADATA_URL'), 'https://saml.acme.net')
      assert.equal(settings.get('SAML_INFO_LABEL'), 'Acme Identity')
      assert.equal(settings.get('SAML_SP_ENTITY_ID'), 'urn:example:sp')
      fs.rmSync(certFile)
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
    await usecase(settings)
    // assert
    assert.isTrue(readStub.calledOnce)
    assert.isTrue(writeStub.calledOnce)
    readStub.restore()
    writeStub.restore()
  })

  it('should write auth providers configuration into a file', async function () {
    // arrange
    const providersFile = temporaryFile({ extension: 'json' })
    const readStub = sinon.stub(ConfigurationRepository.prototype, 'read').callsFake(() => {
      const settings = new Map()
      settings.set('AUTH_PROVIDERS_FILE', providersFile)
      return settings
    })
    const writeStub = sinon.stub(ConfigurationRepository.prototype, 'write').callsFake((settings) => {
      assert.isDefined(settings)
      assert.lengthOf(settings, 1)
      assert.isTrue(settings.has('AUTH_PROVIDERS_FILE'))
    })
    // act
    const settings = new Map()
    const providers = [{
      label: 'Acme Identity',
      protocol: 'saml',
    }, {
      label: 'Coyote Security',
      protocol: 'saml'
    }]
    settings.set('AUTH_PROVIDERS', providers)
    await usecase(settings)
    // assert
    try {
      assert.isTrue(readStub.calledOnce)
      assert.isTrue(writeStub.calledOnce)
      const config = fs.readFileSync(providersFile, 'utf8')
      assert.include(config, '"providers":[{')
      assert.include(config, '"label":"Acme Identity"')
      assert.include(config, '"protocol":"saml"')
      assert.include(config, '"label":"Coyote Security"')
    } finally {
      fs.rmSync(providersFile)
      readStub.restore()
      writeStub.restore()
    }
  })

  it('should write IdP configuration into a file', async function () {
    // arrange
    const readStub = sinon.stub(ConfigurationRepository.prototype, 'read').callsFake(() => {
      return new Map()
    })
    const writeStub = sinon.stub(ConfigurationRepository.prototype, 'write').callsFake((settings) => {
      assert.isDefined(settings)
      assert.lengthOf(settings, 1)
      assert.isTrue(settings.has('IDP_CONFIG_FILE'))
      const filename = settings.get('IDP_CONFIG_FILE')
      const config = fs.readFileSync(filename, 'utf8')
      assert.include(config, 'module.exports')
      assert.include(config, 'urn:swarm-example:sp')
      fs.rmSync(filename)
    })
    // act
    const settings = new Map()
    settings.set('IDP_CONFIG', {
      'urn:swarm-example:sp': { acsUrl: 'https://swarm.example.com' }
    })
    await usecase(settings)
    // assert
    assert.isTrue(readStub.calledOnce)
    assert.isTrue(writeStub.calledOnce)
    readStub.restore()
    writeStub.restore()
  })

  it('should write IdP metadata into a file', async function () {
    // arrange
    const readStub = sinon.stub(ConfigurationRepository.prototype, 'read').callsFake(() => {
      return new Map()
    })
    const writeStub = sinon.stub(ConfigurationRepository.prototype, 'write').callsFake((settings) => {
      assert.isDefined(settings)
      assert.lengthOf(settings, 1)
      assert.isTrue(settings.has('SAML_IDP_METADATA_FILE'))
      const filename = settings.get('SAML_IDP_METADATA_FILE')
      const config = fs.readFileSync(filename, 'utf8')
      assert.include(config, '<something/>')
      fs.rmSync(filename)
    })
    // act
    const settings = new Map()
    settings.set('SAML_IDP_METADATA', '<xml><something/></xml>')
    await usecase(settings)
    // assert
    assert.isTrue(readStub.calledOnce)
    assert.isTrue(writeStub.calledOnce)
    readStub.restore()
    writeStub.restore()
  })
})
