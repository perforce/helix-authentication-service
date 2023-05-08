//
// Copyright 2022 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { before, describe, it } from 'mocha'
import mute from 'mute'
import FetchSamlMetadata from 'helix-auth-svc/lib/features/login/domain/usecases/FetchSamlMetadata.js'

describe('FetchSamlMetadata use case', function () {
  let usecase

  before(function () {
    if (process.env.UNIT_ONLY) {
      this.skip()
    } else {
      usecase = FetchSamlMetadata()
    }
  })

  it('should raise an error for invalid input', function () {
    try {
      usecase(null)
      assert.fail('should have raised error')
    } catch (err) {
      assert.instanceOf(err, AssertionError)
    }
  })

  it('should raise error if fetching URL fails', async function () {
    // arrange
    try {
      // act (fails because Node.js rejects self-signed certs)
      await usecase({}, { metadataUrl: 'https://shibboleth.doc:4443/idp/shibboleth' })
      assert.fail('should have raised error')
    } catch (err) {
      // assert
      assert.include(err.message, 'error fetching IdP metadata URL')
    }
  })

  it('should raise error if reading from file fails', async function () {
    // arrange
    try {
      // act
      await usecase({}, { metadataFile: 'filesdoesnotexist.xml' })
      assert.fail('should have raised error')
    } catch (err) {
      // assert
      assert.include(err.message, 'error reading IdP metadata file')
    }
  })

  it('should raise error if missing IdP entry point', async function () {
    // arrange
    const options = {
      identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified'
    }
    try {
      // act
      await usecase(options)
      assert.fail('should have raised error')
    } catch (err) {
      // assert
      assert.include(err.message, 'identity provider not configured')
    }
  })

  it('should use existing configuration if no URL or file', async function () {
    // arrange
    const options = {
      identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified',
      entryPoint: 'https://shibboleth.doc:4443/idp/profile/SAML2/Redirect/SSO'
    }
    // act
    const result = await usecase(options)
    // assert
    assert.property(result, 'identifierFormat')
    assert.property(result, 'entryPoint')
  })

  it('should read metadata from local file', async function () {
    // arrange
    const options = {}
    const metadataFile = 'test/fixtures/idp-metadata.xml' 
    // act
    const result = await usecase(options, { metadataFile })
    // assert
    assert.property(result, 'entryPoint')
    assert.equal(result.entryPoint, 'https://shibboleth.doc:4443/idp/profile/SAML2/Redirect/SSO')
    assert.isUndefined(result.identifierFormat)
  })

  it('should fetch metadata via URL', async function () {
    // arrange
    const options = {}
    const metadataUrl = 'https://shibboleth.doc:4443/idp/shibboleth'
    // act
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0
    // mute the warning from node about disabling TLS validation
    const unmute = mute(process.stderr)
    const result = await usecase(options, { metadataUrl })
    unmute()
    delete process.env.NODE_TLS_REJECT_UNAUTHORIZED
    // assert
    assert.property(result, 'entryPoint')
    assert.equal(result.entryPoint, 'https://shibboleth.doc:4443/idp/profile/SAML2/Redirect/SSO')
    assert.isUndefined(result.identifierFormat)
  })

  it('should merge custom settings with fetched metadata', async function () {
    // arrange
    const options = { identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified' }
    const metadataUrl = 'https://shibboleth.doc:4443/idp/shibboleth'
    // act
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0
    // mute the warning from node about disabling TLS validation
    const unmute = mute(process.stderr)
    const result = await usecase(options, { metadataUrl })
    unmute()
    delete process.env.NODE_TLS_REJECT_UNAUTHORIZED
    // assert
    assert.property(result, 'entryPoint')
    assert.equal(result.entryPoint, 'https://shibboleth.doc:4443/idp/profile/SAML2/Redirect/SSO')
    assert.property(result, 'identifierFormat')
    assert.equal(result.identifierFormat, 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified')
  })
})
