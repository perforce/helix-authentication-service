//
// Copyright 2023 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { before, describe, it } from 'mocha'
import ValidateAuthProvider from 'helix-auth-svc/lib/features/admin/domain/usecases/ValidateAuthProvider.js'
import TidyAuthProviders from 'helix-auth-svc/lib/features/login/domain/usecases/TidyAuthProviders.js'

describe('TidyAuthProviders use case', function () {
  let usecase

  before(function () {
    usecase = TidyAuthProviders({ validateAuthProvider: ValidateAuthProvider() })
  })

  it('should raise an error for invalid input', async function () {
    assert.throws(() => TidyAuthProviders({ validateAuthProvider: null }), AssertionError)
    try {
      await usecase(null)
      assert.fail('should have raised error')
    } catch (err) {
      assert.instanceOf(err, AssertionError)
    }
  })

  it('should add missing protocols', async function () {
    // arrange
    const providers = [
      {
        issuerUri: 'https://oidc.example.com/issuer',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        id: 'oidc'
      },
      {
        metadataUrl: 'https://saml.example.com/metadata',
        id: 'saml'
      }
    ]
    // act
    const results = await usecase(providers)
    // assert
    assert.propertyVal(results[0], 'protocol', 'oidc')
    assert.propertyVal(results[1], 'protocol', 'saml')
  })

  it('should add missing labels', async function () {
    // arrange
    const providers = [
      {
        issuerUri: 'https://oidc.example.com/issuer',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        protocol: 'oidc',
        id: 'oidc'
      },
      {
        metadataUrl: 'https://saml.example.com/metadata',
        protocol: 'saml',
        id: 'saml'
      }
    ]
    // act
    const results = await usecase(providers)
    // assert
    assert.propertyVal(results[0], 'label', 'oidc.example.com')
    assert.propertyVal(results[1], 'label', 'saml.example.com')
  })

  it('should add missing identifiers', async function () {
    // arrange
    const providers = [
      {
        issuerUri: 'https://oidc.example.com/issuer',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        protocol: 'oidc'
      },
      {
        metadataUrl: 'https://saml.example.com/metadata',
        protocol: 'saml'
      }
    ]
    // act
    const results = await usecase(providers)
    // assert
    assert.notEqual(results[0].id, results[1].id)
  })

  it('should ignore default provider settings', async function () {
    // arrange
    const providers = [
      {
        metadataUrl: 'https://saml.example.com/idp/metadata',
        wantResponseSigned: 'true',
        protocol: 'saml',
        id: 'saml'
      },
      {
        authnContext: 'urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport',
        nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified',
        spEntityId: 'https://has.example.com',
        wantAssertionSigned: 'true',
        wantResponseSigned: 'true',
        keyAlgorithm: 'sha256',
        protocol: 'saml'
      },
      {
        selectAccount: true,
        signingAlgo: 'RS256',
        protocol: 'oidc'
      }
    ]
    // act
    const results = await usecase(providers)
    // assert
    assert.isArray(results)
    assert.lengthOf(results, 1)
    assert.equal(results[0].id, 'saml')
    assert.equal(results[0].protocol, 'saml')
    assert.equal(results[0].metadataUrl, 'https://saml.example.com/idp/metadata')
    assert.isFalse(results[0].wantAssertionSigned)
    assert.isTrue(results[0].wantResponseSigned)
  })
})
