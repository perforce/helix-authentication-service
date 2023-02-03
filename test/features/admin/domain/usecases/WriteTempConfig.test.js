//
// Copyright 2023 Perforce Software
//
import { AssertionError } from 'node:assert'
import * as fs from 'node:fs'
import { assert } from 'chai'
import { before, describe, it } from 'mocha'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'
import WriteTempConfig from 'helix-auth-svc/lib/features/admin/domain/usecases/WriteTempConfig.js'

describe('WriteTempConfig use case', function () {
  const temporaryRepository = new MapSettingsRepository()
  let usecase

  before(function () {
    usecase = WriteTempConfig({ temporaryRepository })
  })

  it('should raise an error for invalid input', async function () {
    assert.throws(() => WriteTempConfig({ temporaryRepository: null }), AssertionError)
  })

  it('should write allowed, non-empty values to the repository', async function () {
    // arrange
    // act
    const settings = new Map()
    settings.set('NAME2', 'VALUE2')
    settings.set('NAME3', 'VALUE#3')
    settings.set('NAME4', '')
    settings.set('ADMIN_ENABLED', false)
    settings.set('ADMIN_USERNAME', 'charlie')
    settings.set('ADMIN_PASSWD_FILE', '/etc/shadow')
    settings.set('ADMIN_P4_AUTH', 'true')
    await usecase(settings)
    // assert
    assert.isFalse(temporaryRepository.has('ADMIN_ENABLED'))
    assert.isFalse(temporaryRepository.has('ADMIN_USERNAME'))
    assert.isFalse(temporaryRepository.has('ADMIN_PASSWD_FILE'))
    assert.isFalse(temporaryRepository.has('ADMIN_P4_AUTH'))
    assert.equal(temporaryRepository.get('NAME2'), 'VALUE2')
    assert.equal(temporaryRepository.get('NAME3'), 'VALUE#3')
    assert.equal(temporaryRepository.get('NAME4'), '')
  })

  it('should write certs and secrets into files', async function () {
    // arrange
    // act
    const settings = new Map()
    settings.set('OIDC_CLIENT_SECRET', 'tiger')
    settings.set('KEY_PASSPHRASE', 'housecat')
    settings.set('CA_CERT', '-----BEGIN CERTIFICATE-----')
    await usecase(settings)
    // assert
    assert.isTrue(temporaryRepository.has('KEY_PASSPHRASE_FILE'))
    assert.isTrue(temporaryRepository.has('OIDC_CLIENT_SECRET_FILE'))
    assert.isTrue(temporaryRepository.has('CA_CERT_FILE'))
    const secret = fs.readFileSync(temporaryRepository.get('OIDC_CLIENT_SECRET_FILE'), 'utf8')
    assert.equal(secret, 'tiger')
    fs.rmSync(temporaryRepository.get('KEY_PASSPHRASE_FILE'))
    fs.rmSync(temporaryRepository.get('OIDC_CLIENT_SECRET_FILE'))
    fs.rmSync(temporaryRepository.get('CA_CERT_FILE'))
  })

  it('should convert auth providers to JSON string', async function () {
    // arrange
    // act
    const settings = new Map()
    const providers = [{ label: 'Acme Identity', protocol: 'saml' }]
    settings.set('AUTH_PROVIDERS', providers)
    await usecase(settings)
    // assert
    assert.isString(temporaryRepository.get('AUTH_PROVIDERS'))
    assert.include(temporaryRepository.get('AUTH_PROVIDERS'), 'Acme Identity')
  })

  it('should write IdP configuration into a file', async function () {
    // arrange
    // act
    const settings = new Map()
    settings.set('IDP_CONFIG', {
      'urn:swarm-example:sp': { acsUrl: 'https://swarm.example.com' }
    })
    await usecase(settings)
    // assert
    assert.isTrue(temporaryRepository.has('IDP_CONFIG_FILE'))
    const config = fs.readFileSync(temporaryRepository.get('IDP_CONFIG_FILE'), 'utf8')
    assert.include(config, 'urn:swarm-example:sp')
    fs.rmSync(temporaryRepository.get('IDP_CONFIG_FILE'))
  })

  it('should write IdP metadata into a file', async function () {
    // arrange
    // act
    const settings = new Map()
    settings.set('SAML_IDP_METADATA', '<xml><something/></xml>')
    await usecase(settings)
    // assert
    assert.isTrue(temporaryRepository.has('SAML_IDP_METADATA_FILE'))
    const metadata = fs.readFileSync(temporaryRepository.get('SAML_IDP_METADATA_FILE'), 'utf8')
    assert.include(metadata, '<something/>')
    fs.rmSync(temporaryRepository.get('SAML_IDP_METADATA_FILE'))
  })
})
