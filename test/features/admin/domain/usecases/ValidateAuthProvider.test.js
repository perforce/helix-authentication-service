//
// Copyright 2023 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { describe, it } from 'mocha'
import ValidateAuthProvider from 'helix-auth-svc/lib/features/admin/domain/usecases/ValidateAuthProvider.js'

describe('ValidateAuthProvider use case', function () {
  const usecase = ValidateAuthProvider()

  it('should raise an error for invalid input', async function () {
    try {
      await usecase(null)
      assert.fail('should have raised error')
    } catch (err) {
      assert.instanceOf(err, AssertionError)
    }
  })

  it('should approve a valid oidc auth provider', async function () {
    // arrange
    const provider = {
      clientId: "client-id",
      clientSecret: "client-secret",
      issuerUri: "https://oidc.example.com",
      selectAccount: "false",
      signingAlgo: "RS256",
      maxAge: 1024,
      label: "Provider",
      protocol: "oidc",
      id: "oidc-1"
    }
    // act
    const result = await usecase(provider)
    // assert
    assert.isNull(result)
  })

  it('should approve an oidc provider with cert/key', async function () {
    // arrange
    const provider = {
      clientId: "client-id",
      clientCert: "-----BEGIN CERTIFICATE-----",
      clientKey: "-----BEGIN PRIVATE KEY-----",
      issuerUri: "https://oidc.example.com",
      selectAccount: "false",
      signingAlgo: "RS256",
      maxAge: 1024,
      label: "Provider",
      protocol: "oidc",
      id: "oidc-1"
    }
    // act
    const result = await usecase(provider)
    // assert
    assert.isNull(result)
  })

  it('should approve an oidc provider with cert/key files', async function () {
    // arrange
    const provider = {
      clientId: "client-id",
      clientCertFile: "certs/server.crt",
      clientKeyFile: "certs/server.key",
      issuerUri: "https://oidc.example.com",
      selectAccount: "false",
      signingAlgo: "RS256",
      maxAge: 1024,
      label: "Provider",
      protocol: "oidc",
      id: "oidc-1"
    }
    // act
    const result = await usecase(provider)
    // assert
    assert.isNull(result)
  })

  it('should approve a valid oidc(file) auth provider', async function () {
    // arrange
    const provider = {
      clientId: "client-id",
      // name a clientSecretFile that actually exists
      clientSecretFile: "package.json",
      issuerUri: "https://oidc.example.com",
      selectAccount: "false",
      signingAlgo: "RS256",
      label: "Provider",
      protocol: "oidc",
      id: "oidc-1"
    }
    // act
    const result = await usecase(provider)
    // assert
    assert.isNull(result)
  })

  it('should approve a valid saml auth provider', async function () {
    // arrange
    const provider = {
      metadataUrl: "https://saml.example.com",
      label: "Provider",
      protocol: "saml",
      id: "saml-1"
    }
    // act
    const result = await usecase(provider)
    // assert
    assert.isNull(result)
  })

  it('should approve a valid saml(file) auth provider', async function () {
    // arrange
    const provider = {
      metadataFile: "package.json",
      label: "Provider",
      protocol: "saml",
      id: "saml-1"
    }
    // act
    const result = await usecase(provider)
    // assert
    assert.isNull(result)
  })

  it('should prune empty, null, undefined properties', async function () {
    // arrange
    const provider = {
      metadataUrl: "https://saml.example.com",
      signingAlgo: null,
      codeChallenge: undefined,
      spEntityId: '',
      label: "Provider",
      protocol: "saml",
      id: "saml-1"
    }
    // act
    const result = await usecase(provider)
    // assert
    assert.isNull(result)
    assert.notProperty(provider, 'codeChallenge')
    assert.notProperty(provider, 'signingAlgo')
    assert.notProperty(provider, 'spEntityId')
    assert.equal(provider.protocol, 'saml')
    assert.equal(provider.id, 'saml-1')
    assert.equal(provider.label, 'Provider')
    assert.equal(provider.metadataUrl, 'https://saml.example.com')
  })

  it('should reject provider missing protocol property', async function () {
    // arrange
    const provider = {
      clientId: "client-id",
      clientSecret: "client-secret",
      issuerUri: "https://oidc.example.com",
      selectAccount: "false",
      signingAlgo: "RS256",
      label: "Provider",
      id: "oidc-1"
    }
    // act
    const result = await usecase(provider)
    // assert
    assert.equal(result, 'missing protocol property')
  })

  it('should reject provider with unsupported protocol', async function () {
    // arrange
    const provider = {
      clientId: "client-id",
      clientSecret: "client-secret",
      issuerUri: "https://oidc.example.com",
      selectAccount: "false",
      signingAlgo: "RS256",
      label: "Provider",
      protocol: 'foobar',
      id: "oidc-1"
    }
    // act
    const result = await usecase(provider)
    // assert
    assert.equal(result, 'unsupported protocol: foobar')
  })

  it('should reject provider with id of "undefined"', async function () {
    // arrange
    const provider = {
      clientId: "client-id",
      clientSecret: "client-secret",
      issuerUri: "https://oidc.example.com",
      selectAccount: "false",
      signingAlgo: "RS256",
      label: "Provider",
      protocol: 'oidc',
      id: "undefined"
    }
    // act
    const result = await usecase(provider)
    // assert
    assert.equal(result, 'must provide a valid identifier')
  })

  it('should reject provider with id of "null"', async function () {
    // arrange
    const provider = {
      clientId: "client-id",
      clientSecret: "client-secret",
      issuerUri: "https://oidc.example.com",
      selectAccount: "false",
      signingAlgo: "RS256",
      label: "Provider",
      protocol: 'oidc',
      id: "null"
    }
    // act
    const result = await usecase(provider)
    // assert
    assert.equal(result, 'must provide a valid identifier')
  })

  it('should reject oidc provider missing isserUri property', async function () {
    // arrange
    const provider = {
      clientId: "client-id",
      clientSecret: "client-secret",
      selectAccount: "false",
      signingAlgo: "RS256",
      label: "Provider",
      protocol: 'oidc',
      id: "oidc-1"
    }
    // act
    const result = await usecase(provider)
    // assert
    assert.equal(result, 'missing issuerUri property')
  })

  it('should reject oidc provider with invalid isserUri', async function () {
    // arrange
    const provider = {
      clientId: "client-id",
      clientSecret: "client-secret",
      issuerUri: "data:thisisnotvalid",
      selectAccount: "false",
      signingAlgo: "RS256",
      label: "Provider",
      protocol: 'oidc',
      id: "oidc-1"
    }
    // act
    const result = await usecase(provider)
    // assert
    assert.include(result, 'invalid issuerUri:')
  })

  it('should reject oidc provider missing clientId property', async function () {
    // arrange
    const provider = {
      clientSecret: "client-secret",
      issuerUri: "https://oidc.example.com",
      selectAccount: "false",
      signingAlgo: "RS256",
      label: "Provider",
      protocol: "oidc",
      id: 'oidc-1'
    }
    // act
    const result = await usecase(provider)
    // assert
    assert.equal(result, 'missing clientId property')
  })

  it('should reject oidc provider missing clientSecret property', async function () {
    // arrange
    const provider = {
      clientId: "client-id",
      issuerUri: "https://oidc.example.com",
      selectAccount: "false",
      signingAlgo: "RS256",
      label: "Provider",
      protocol: "oidc",
      id: 'oidc-1'
    }
    // act
    const result = await usecase(provider)
    // assert
    assert.equal(result, 'must have one of: clientSecret, clientSecretFile')
  })

  it('should reject oidc provider missing clientSecretFile', async function () {
    // arrange
    const provider = {
      clientId: "client-id",
      clientSecretFile: 'nosuchfile',
      issuerUri: "https://oidc.example.com",
      selectAccount: "false",
      signingAlgo: "RS256",
      label: "Provider",
      protocol: "oidc",
      id: 'oidc-1'
    }
    // act
    const result = await usecase(provider)
    // assert
    assert.equal(result, 'missing file: nosuchfile')
  })

  it('should reject oidc provider with invalid maxAge', async function () {
    // arrange
    const provider = {
      clientId: "client-id",
      clientSecret: 'client-secret',
      issuerUri: "https://oidc.example.com",
      selectAccount: "false",
      signingAlgo: "RS256",
      maxAge: 'foobar',
      label: "Provider",
      protocol: "oidc",
      id: 'oidc-1'
    }
    // act
    const result = await usecase(provider)
    // assert
    assert.equal(result, 'invalid maxAge: foobar')
  })

  it('should reject saml provider with invalid metadataUrl', async function () {
    // arrange
    const provider = {
      metadataUrl: "data:thisisnotvalid",
      label: "Provider",
      protocol: 'saml',
      id: "saml-1"
    }
    // act
    const result = await usecase(provider)
    // assert
    assert.include(result, 'invalid metadataUrl:')
  })

  it('should reject saml provider missing metadataFile', async function () {
    // arrange
    const provider = {
      metadataFile: "nosuchfile",
      label: "Provider",
      protocol: 'saml',
      id: "saml-1"
    }
    // act
    const result = await usecase(provider)
    // assert
    assert.include(result, 'missing file: nosuchfile')
  })

  it('should reject saml provider with invalid signonUrl', async function () {
    // arrange
    const provider = {
      signonUrl: "data:thisisnotvalid",
      label: "Provider",
      protocol: 'saml',
      id: "saml-1"
    }
    // act
    const result = await usecase(provider)
    // assert
    assert.include(result, 'invalid signonUrl:')
  })

  it('should reject saml provider missing everything', async function () {
    // arrange
    const provider = {
      label: "Provider",
      protocol: "saml",
      id: 'saml-1'
    }
    // act
    const result = await usecase(provider)
    // assert
    assert.include(result, 'must have one of: metadata, metadataUrl,')
  })
})
