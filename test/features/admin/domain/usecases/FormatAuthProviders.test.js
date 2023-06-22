//
// Copyright 2023 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { after, before, describe, it } from 'mocha'
import sinon from 'sinon'
import { DefaultsEnvRepository } from 'helix-auth-svc/lib/common/data/repositories/DefaultsEnvRepository.js'
import FormatAuthProviders from 'helix-auth-svc/lib/features/admin/domain/usecases/FormatAuthProviders.js'

describe('FormatAuthProviders use case', function () {
  let usecase

  before(function () {
    const defaultsRepository = new DefaultsEnvRepository()
    usecase = FormatAuthProviders({ defaultsRepository })
  })

  after(function () {
    sinon.restore()
  })

  it('should raise an error for invalid input', async function () {
    assert.throws(() => FormatAuthProviders({ defaultsRepository: null }), AssertionError)
  })

  it('should filter defaults from auth providers', async function () {
    // arrange
    // act
    const settings = new Map()
    const input = [{
      label: 'Acme Identity',
      protocol: 'saml',
      id: 'saml-0',
      metadataUrl: 'https://saml1.example.com',
      wantAssertionSigned: true,
      wantResponseSigned: true,
      spEntityId: 'https://has.example.com',
      keyAlgorithm: 'sha256',
      authnContext: 'urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport',
      nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified'
    }, {
      label: 'Coyote Security',
      protocol: 'saml',
      id: 'saml-1',
      metadataUrl: 'https://saml2.example.com'
    }, {
      label: 'Pong Anonymous',
      protocol: 'oidc',
      id: 'oidc-0',
      issuerUri: 'https://oidc1.example.com',
      clientId: 'client-id',
      clientSecret: 'client-secret',
      selectAccount: false,
      signingAlgo: 'RS256'
    }, {
      label: 'Veritas Solutions',
      protocol: 'oidc',
      id: 'oidc-1',
      issuerUri: 'https://oidc2.example.com',
      clientId: 'client-id',
      clientSecret: 'client-secret'
    }]
    settings.set('AUTH_PROVIDERS', input)
    await usecase(settings)
    // assert
    assert.isTrue(settings.has('AUTH_PROVIDERS'))
    const providers = JSON.parse(settings.get('AUTH_PROVIDERS')).providers
    assert.equal(providers[0].label, 'Acme Identity')
    assert.equal(providers[0].protocol, 'saml')
    assert.equal(providers[0].metadataUrl, 'https://saml1.example.com')
    assert.notProperty(providers[0], 'id')
    assert.notProperty(providers[0], 'wantAssertionSigned')
    assert.notProperty(providers[0], 'wantResponseSigned')
    assert.notProperty(providers[0], 'spEntityId')
    assert.notProperty(providers[0], 'keyAlgorithm')
    assert.notProperty(providers[0], 'authnContext')
    assert.notProperty(providers[0], 'nameIdFormat')
    assert.equal(providers[2].label, 'Pong Anonymous')
    assert.equal(providers[2].protocol, 'oidc')
    assert.equal(providers[2].issuerUri, 'https://oidc1.example.com')
    assert.equal(providers[2].clientId, 'client-id')
    assert.equal(providers[2].clientSecret, 'client-secret')
    assert.notProperty(providers[2], 'id')
    assert.notProperty(providers[2], 'selectAccount')
    assert.notProperty(providers[2], 'signingAlgo')
  })
})
