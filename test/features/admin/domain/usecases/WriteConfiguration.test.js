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
import WriteConfiguration from 'helix-auth-svc/lib/features/admin/domain/usecases/WriteConfiguration.js'

describe('WriteConfiguration use case', function () {
  let usecase

  before(function () {
    const configRepository = new ConfigurationRepository()
    usecase = WriteConfiguration({ configRepository })
  })

  after(function () {
    sinon.restore()
  })

  it('should raise an error for invalid input', async function () {
    assert.throws(() => WriteConfiguration({ configRepository: null }), AssertionError)
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
      return results
    })
    const writeStub = sinon.stub(ConfigurationRepository.prototype, 'write').callsFake((settings) => {
      assert.isDefined(settings)
      assert.lengthOf(settings, 6)
      assert.equal(settings.get('NAME1'), 'VALUE1')
      assert.equal(settings.get('NAME2'), 'VALUE2')
      assert.equal(settings.get('NAME3'), 'VALUE#3')
      assert.isTrue(settings.get('ADMIN_ENABLED'))
      assert.equal(settings.get('ADMIN_USERNAME'), 'scott')
      assert.equal(settings.get('ADMIN_PASSWD_FILE'), '/etc/passwd')
    })
    // act
    const settings = new Map()
    settings.set('NAME2', 'VALUE2')
    settings.set('NAME3', 'VALUE#3')
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

  it('should write secrets into files', async function () {
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
      assert.isTrue(settings.has('OIDC_CLIENT_SECRET_FILE'))
      assert.isTrue(settings.has('KEY_PASSPHRASE_FILE'))
      const filename = settings.get('KEY_PASSPHRASE_FILE')
      const secret = fs.readFileSync(filename, 'utf8')
      assert.equal(secret, 'housecat')
      fs.rmSync(filename)
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
})
