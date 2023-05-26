//
// Copyright 2023 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { before, describe, it } from 'mocha'
import TidyAuthProviders from 'helix-auth-svc/lib/features/login/domain/usecases/TidyAuthProviders.js'

describe('TidyAuthProviders use case', function () {
  let usecase

  before(function () {
    usecase = TidyAuthProviders()
  })

  it('should raise an error for invalid input', async function () {
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
        id: 'oidc'
      },
      {
        metadataUrl: 'https://saml.example.com/metadata',
        id: 'saml'
      }
    ]
    // act
    await usecase(providers)
    // assert
    assert.propertyVal(providers[0], 'protocol', 'oidc')
    assert.propertyVal(providers[1], 'protocol', 'saml')
  })

  it('should add missing labels', async function () {
    // arrange
    const providers = [
      {
        issuerUri: 'https://oidc.example.com/issuer',
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
    await usecase(providers)
    // assert
    assert.propertyVal(providers[0], 'label', 'oidc.example.com')
    assert.propertyVal(providers[1], 'label', 'saml.example.com')
  })

  it('should add missing identifiers', async function () {
    // arrange
    const providers = [
      {
        issuerUri: 'https://oidc.example.com/issuer',
        protocol: 'oidc'
      },
      {
        metadataUrl: 'https://saml.example.com/metadata',
        protocol: 'saml'
      }
    ]
    // act
    await usecase(providers)
    // assert
    assert.propertyVal(providers[0], 'id', 'oidc-0')
    assert.propertyVal(providers[1], 'id', 'saml-1')
  })
})
