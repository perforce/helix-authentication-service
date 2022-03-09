//
// Copyright 2022 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { before, beforeEach, describe, it } from 'mocha'
import mute from 'mute'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'
import FetchSamlMetadata from 'helix-auth-svc/lib/features/login/domain/usecases/FetchSamlMetadata.js'

describe('FetchSamlMetadata use case', function () {
  const settings = new Map()
  let usecase

  before(function () {
    const settingsRepository = new MapSettingsRepository(settings)
    usecase = FetchSamlMetadata({ settingsRepository })
  })

  beforeEach(function () {
    settings.clear()
  })

  it('should raise an error for invalid input', function () {
    assert.throws(() => FetchSamlMetadata({ settingsRepository: null }), AssertionError)
    try {
      usecase(null)
      assert.fail('should have raised error')
    } catch (err) {
      assert.instanceOf(err, AssertionError)
    }
  })

  it('should raise error if fetching URL fails', async function () {
    // arrange
    settings.set('SAML_IDP_METADATA_URL', 'https://shibboleth.doc:4443/idp/shibboleth')
    try {
      // act (fails because Node.js rejects self-signed certs)
      await usecase({})
      assert.fail('should have raised error')
    } catch (err) {
      // assert
      assert.include(err.message, 'error fetching IdP metadata URL')
    }
  })

  it('should raise error if reading from file fails', async function () {
    // arrange
    settings.set('SAML_IDP_METADATA_FILE', 'filesdoesnotexist.xml')
    try {
      // act
      await usecase({})
      assert.fail('should have raised error')
    } catch (err) {
      // assert
      assert.include(err.message, 'error reading IdP metadata file')
    }
  })

  it('should use existing configuration if no URL or file', async function () {
    // arrange
    settings.set('SAML_IDP_SSO_URL', 'https://shibboleth.doc:4443/idp/profile/SAML2/Redirect/SSO')
    // act
    const result = await usecase({ field1: 'value1' })
    // assert
    assert.deepEqual(result, { field1: 'value1' })
  })

  it('should read metadata from local file', async function () {
    // arrange
    settings.set('SAML_IDP_METADATA_FILE', 'containers/shibboleth/shibboleth-idp/metadata/idp-metadata.xml')
    // act
    const result = await usecase({})
    // assert
    assert.property(result, 'entryPoint')
    assert.equal(result.entryPoint, 'https://shibboleth.doc:4443/idp/profile/SAML2/Redirect/SSO')
    assert.isUndefined(result.identifierFormat)
  })

  it('should fetch metadata via URL', async function () {
    // arrange
    settings.set('SAML_IDP_METADATA_URL', 'https://shibboleth.doc:4443/idp/shibboleth')
    // act
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0
    // mute the warning from node about disabling TLS validation
    const unmute = mute(process.stderr)
    const result = await usecase({})
    unmute()
    delete process.env.NODE_TLS_REJECT_UNAUTHORIZED
    // assert
    assert.property(result, 'entryPoint')
    assert.equal(result.entryPoint, 'https://shibboleth.doc:4443/idp/profile/SAML2/Redirect/SSO')
    assert.isUndefined(result.identifierFormat)
  })

  it('should merge custom settings with fetched metadata', async function () {
    // arrange
    settings.set('SAML_IDP_METADATA_URL', 'https://shibboleth.doc:4443/idp/shibboleth')
    // act
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0
    // mute the warning from node about disabling TLS validation
    const unmute = mute(process.stderr)
    const result = await usecase({
      identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified'
    })
    unmute()
    delete process.env.NODE_TLS_REJECT_UNAUTHORIZED
    // assert
    assert.property(result, 'entryPoint')
    assert.equal(result.entryPoint, 'https://shibboleth.doc:4443/idp/profile/SAML2/Redirect/SSO')
    assert.property(result, 'identifierFormat')
    assert.equal(result.identifierFormat, 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified')
  })
})
