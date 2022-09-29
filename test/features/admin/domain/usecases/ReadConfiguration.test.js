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
import ReadConfiguration from 'helix-auth-svc/lib/features/admin/domain/usecases/ReadConfiguration.js'

describe('ReadConfiguration use case', function () {
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
    usecase = ReadConfiguration({ configRepository, getIdPConfiguration })
  })

  after(function () {
    sinon.restore()
  })

  it('should raise an error for invalid input', async function () {
    assert.throws(() => ReadConfiguration({ configRepository: null }), AssertionError)
    assert.throws(() => ReadConfiguration({ configRepository: {}, getIdPConfiguration: null }), AssertionError)
  })

  it('should read values from the repository', async function () {
    // arrange
    const readStub = sinon.stub(ConfigurationRepository.prototype, 'read').callsFake(() => {
      const results = new Map()
      results.set('NAME1', 'VALUE1')
      results.set('ADMIN_ENABLED', true)
      results.set('ADMIN_USERNAME', 'scott')
      results.set('ADMIN_PASSWD_FILE', '/etc/passwd')
      return results
    })
    // act
    const settings = await usecase()
    // assert
    assert.lengthOf(settings, 1)
    assert.equal(settings.get('NAME1'), 'VALUE1')
    assert.isTrue(readStub.calledOnce)
    readStub.restore()
  })

  it('should rename old settings to new names', async function () {
    // arrange
    const certFile = temporaryFile({ extension: 'crt' })
    fs.writeFileSync(certFile, '-----BEGIN CERTIFICATE-----')
    const keyFile = temporaryFile({ extension: 'key' })
    fs.writeFileSync(keyFile, '-----BEGIN PRIVATE KEY-----')
    const readStub = sinon.stub(ConfigurationRepository.prototype, 'read').callsFake(() => {
      const results = new Map()
      results.set('SAML_SP_ISSUER', 'spIssuer')
      results.set('SAML_IDP_ISSUER', 'idpIssuer')
      results.set('SP_CERT_FILE', certFile)
      results.set('SP_KEY_FILE', keyFile)
      return results
    })
    // act
    const settings = await usecase()
    // assert
    assert.lengthOf(settings, 6)
    assert.equal(settings.get('SAML_SP_ENTITY_ID'), 'spIssuer')
    assert.equal(settings.get('SAML_IDP_ENTITY_ID'), 'idpIssuer')
    assert.equal(settings.get('CERT'), '-----BEGIN CERTIFICATE-----')
    assert.equal(settings.get('CERT_FILE'), certFile)
    assert.equal(settings.get('KEY'), '-----BEGIN PRIVATE KEY-----')
    assert.equal(settings.get('KEY_FILE'), keyFile)
    assert.isTrue(readStub.calledOnce)
    readStub.restore()
  })

  it('should read secrets from files into settings', async function () {
    // arrange
    const secretFile = temporaryFile({ extension: 'txt' })
    fs.writeFileSync(secretFile, 'tiger')
    const passwdFile = temporaryFile({ extension: 'txt' })
    fs.writeFileSync(passwdFile, 'housecat')
    const readStub = sinon.stub(ConfigurationRepository.prototype, 'read').callsFake(() => {
      const results = new Map()
      results.set('OIDC_CLIENT_SECRET_FILE', secretFile)
      results.set('KEY_PASSPHRASE_FILE', passwdFile)
      return results
    })
    // act
    const settings = await usecase()
    // assert
    assert.lengthOf(settings, 4)
    assert.equal(settings.get('OIDC_CLIENT_SECRET'), 'tiger')
    assert.isTrue(settings.has('OIDC_CLIENT_SECRET_FILE'))
    assert.equal(settings.get('KEY_PASSPHRASE'), 'housecat')
    assert.isTrue(settings.has('KEY_PASSPHRASE_FILE'))
    assert.isTrue(readStub.calledOnce)
    readStub.restore()
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
    // act
    const settings = await usecase()
    // assert
    assert.lengthOf(settings, 6)
    assert.equal(settings.get('CA_CERT'), '-----BEGIN AUTHORITY-----')
    assert.isTrue(settings.has('CA_CERT_FILE'))
    assert.equal(settings.get('CERT'), '-----BEGIN CERTIFICATE-----')
    assert.isTrue(settings.has('CERT_FILE'))
    assert.equal(settings.get('KEY'), '-----BEGIN PRIVATE KEY-----')
    assert.isTrue(settings.has('KEY_FILE'))
    assert.isTrue(readStub.calledOnce)
    readStub.restore()
  })

  it('should read auth providers from setting', async function () {
    // arrange
    const providers = {
      providers: [{ label: 'Acme Identity', protocol: 'saml' }]
    }
    const readStub = sinon.stub(ConfigurationRepository.prototype, 'read').callsFake(() => {
      const results = new Map()
      results.set('AUTH_PROVIDERS', JSON.stringify(providers))
      return results
    })
    // act
    const settings = await usecase()
    // assert
    assert.lengthOf(settings, 1)
    assert.isTrue(settings.has('AUTH_PROVIDERS'))
    const actual = settings.get('AUTH_PROVIDERS')
    assert.lengthOf(actual, 1)
    assert.property(actual[0], 'label')
    assert.equal(actual[0].label, 'Acme Identity')
    assert.equal(actual[0].protocol, 'saml')
    assert.isTrue(readStub.calledOnce)
    readStub.restore()
  })

  it('should read auth providers from file', async function () {
    // arrange
    const providersFile = temporaryFile({ extension: 'json' })
    const providers = {
      providers: [{ label: 'Acme Identity', protocol: 'saml' }]
    }
    fs.writeFileSync(providersFile, JSON.stringify(providers))
    const readStub = sinon.stub(ConfigurationRepository.prototype, 'read').callsFake(() => {
      const results = new Map()
      results.set('AUTH_PROVIDERS_FILE', providersFile)
      return results
    })
    // act
    const settings = await usecase()
    // assert
    assert.lengthOf(settings, 2)
    assert.isTrue(settings.has('AUTH_PROVIDERS'))
    const actual = settings.get('AUTH_PROVIDERS')
    assert.lengthOf(actual, 1)
    assert.property(actual[0], 'label')
    assert.equal(actual[0].label, 'Acme Identity')
    assert.equal(actual[0].protocol, 'saml')
    assert.isTrue(readStub.calledOnce)
    readStub.restore()
  })

  it('should read IdP configuration into settings', async function () {
    // arrange
    const readStub = sinon.stub(ConfigurationRepository.prototype, 'read').callsFake(() => {
      const results = new Map()
      results.set('IDP_CONFIG_FILE', 'routes/samlidp.cjs')
      return results
    })
    // act
    const settings = await usecase()
    // assert
    assert.lengthOf(settings, 2)
    assert.equal(settings.get('IDP_CONFIG_FILE'), 'routes/samlidp.cjs')
    assert.isTrue(settings.has('IDP_CONFIG'))
    const idpConfig = settings.get('IDP_CONFIG')
    assert.property(idpConfig, 'urn:swarm-example:sp')
    assert.isTrue(readStub.calledOnce)
    readStub.restore()
  })
})
