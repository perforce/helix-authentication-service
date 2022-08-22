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
    usecase = ReadConfiguration({ configRepository })
  })

  after(function () {
    sinon.restore()
  })

  it('should raise an error for invalid input', async function () {
    assert.throws(() => ReadConfiguration({ configRepository: null }), AssertionError)
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
    const readStub = sinon.stub(ConfigurationRepository.prototype, 'read').callsFake(() => {
      const results = new Map()
      results.set('SAML_SP_ISSUER', 'spIssuer')
      results.set('SAML_IDP_ISSUER', 'idpIssuer')
      results.set('SP_CERT_FILE', 'cert.pem')
      results.set('SP_KEY_FILE', 'key.pem')
      return results
    })
    // act
    const settings = await usecase()
    // assert
    assert.lengthOf(settings, 4)
    assert.equal(settings.get('SAML_SP_ENTITY_ID'), 'spIssuer')
    assert.equal(settings.get('SAML_IDP_ENTITY_ID'), 'idpIssuer')
    assert.equal(settings.get('CERT_FILE'), 'cert.pem')
    assert.equal(settings.get('KEY_FILE'), 'key.pem')
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
})
