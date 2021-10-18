//
// Copyright 2021 Perforce Software
//
const path = require('path')
const { assert } = require('chai')
const { describe, it } = require('mocha')

/* global include */
global.include = (p) => require(path.join(__dirname, '../../../../..', p))
const sut = include('lib/features/login/presentation/routes/common')

describe('Login routes common', function () {
  describe('defaultProtocol', function () {
    it('should default to saml if nothing else', function () {
      assert.equal(sut.defaultProtocol(new Map()), 'saml')
    })

    it('should default to oidc if OIDC is configured', function () {
      const settings = new Map([
        ['OIDC_ISSUER_URI', 'https://example.com/oidc']
      ])
      assert.equal(sut.defaultProtocol(settings), 'oidc')
    })

    it('should default to saml if any SAML settings', function () {
      assert.equal(sut.defaultProtocol(new Map([['SAML_IDP_METADATA_FILE', '111']])), 'saml')
      assert.equal(sut.defaultProtocol(new Map([['SAML_IDP_METADATA_URL', '111']])), 'saml')
      assert.equal(sut.defaultProtocol(new Map([['SAML_IDP_SSO_URL', '111']])), 'saml')
    })
  })

  describe('isSamlConfigured', function () {
    it('should return true if any SAML settings', function () {
      assert.isTrue(sut.isSamlConfigured(new Map([['SAML_IDP_METADATA_FILE', '111']])))
      assert.isTrue(sut.isSamlConfigured(new Map([['SAML_IDP_METADATA_URL', '111']])))
      assert.isTrue(sut.isSamlConfigured(new Map([['SAML_IDP_SSO_URL', '111']])))
    })

    it('should return false if no SAML settings', function () {
      assert.isFalse(sut.isSamlConfigured(new Map()))
    })
  })
})
