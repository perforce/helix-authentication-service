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
    assert.lengthOf(providers, 4)
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
    assert.equal(providers[1].label, 'Coyote Security')
    assert.equal(providers[1].protocol, 'saml')
    assert.equal(providers[1].metadataUrl, 'https://saml2.example.com')
    assert.equal(providers[3].label, 'Veritas Solutions')
    assert.equal(providers[3].protocol, 'oidc')
    assert.equal(providers[3].issuerUri, 'https://oidc2.example.com')
  })

  it('should encode certain fields for JSON safety', async function () {
    // arrange
    //
    // genuine SAML metadata minus a huge chunk of extra stuff that does not
    // change the outcome; there are characters within that seem to cause
    // problems when reading the JSON blob from the settings
    //
    const rawMetadata = `<?xml version="1.0" encoding="utf-8"?>
<EntityDescriptor
    ID="_0632f2bb-2575-4df6-8f8f-19663250cecb"
    entityID="https://sts.windows.net/01347add-dc0c-4f44-8418-5dcf2a134b06/"
    xmlns="urn:oasis:names:tc:SAML:2.0:metadata">
    <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
        <SignedInfo>
            <CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#" />
            <SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256" />
            <Reference URI="#_0632f2bb-2575-4df6-8f8f-19663250cecb">
                <Transforms>
                    <Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature" />
                    <Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#" />
                </Transforms>
                <DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256" />
                <DigestValue>322A0Na9UQS6P/qa/JeevSlPDxBzeN4fRCeVzY1oywE=</DigestValue>
            </Reference>
        </SignedInfo>
        <SignatureValue>dKUTn+xNR74muj195Bg2rgPDiCI/18p65+n3cAUge1AB3ewuu4UCg9wqD+xaOwGSG+/4Fd71z6SUylNbx5fvw==</SignatureValue>
        <KeyInfo>
            <X509Data>
                <X509Certificate>MIIC8DCCAdiLd9nT9HVh4c+QOMpNurcJCqnfkKnlSXsgT1n/9CLj3cun</X509Certificate>
            </X509Data>
        </KeyInfo>
    </Signature>
    <IDPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
        <KeyDescriptor use="signing">
            <KeyInfo xmlns="http://www.w3.org/2000/09/xmldsig#">
                <X509Data>
                    <X509Certificate>MIIC8DCCAdigAwIBApNurcJCqnfkKnlSXsgT1n/9CLj3cun</X509Certificate>
                </X509Data>
            </KeyInfo>
        </KeyDescriptor>
        <SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="https://login.microsoftonline.com/01347add-dc0c-4f44-8418-5dcf2a134b06/saml2" />
    </IDPSSODescriptor>
</EntityDescriptor>
`
    // act
    const settings = new Map()
    const input = [{
      label: 'Acme Identity',
      protocol: 'saml',
      id: 'saml-0',
      metadata: rawMetadata
    }]
    settings.set('AUTH_PROVIDERS', input)
    await usecase(settings)
    // assert
    assert.isTrue(settings.has('AUTH_PROVIDERS'))
    const providers = JSON.parse(settings.get('AUTH_PROVIDERS')).providers
    assert.lengthOf(providers, 1)
    assert.equal(providers[0].label, 'Acme Identity')
    assert.equal(providers[0].protocol, 'saml')
    assert.isTrue(providers[0].metadata.startsWith('PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTg'))
    assert.isTrue(providers[0].metadata.endsWith('jcmlwdG9yPgo8L0VudGl0eURlc2NyaXB0b3I+Cg=='))
  })
})
