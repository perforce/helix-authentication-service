//
// Copyright 2022 Perforce Software
//
import { AssertionError } from 'node:assert'
import * as fs from 'node:fs/promises'
import { assert } from 'chai'
import { describe, it } from 'mocha'
import { temporaryFile } from 'tempy'
import { DotenvRepository } from 'helix-auth-svc/lib/features/admin/data/repositories/DotenvRepository.js'

describe('dotenv configuration repository', function () {
  it('should raise an error for invalid input', function () {
    const repository = new DotenvRepository({ dotenvFile: '.env' })
    assert.throws(() => repository.write(), AssertionError)
    assert.throws(() => repository.write(null), AssertionError)
  })

  it('should return empty set for missing file', async function () {
    // arrange
    const repository = new DotenvRepository({ dotenvFile: 'nosuchfile.env' })
    // act
    const settings = await repository.read()
    // assert
    assert.isEmpty(settings)
  })

  it('should return empty set for "empty" file', async function () {
    // arrange
    const dotenvFile = temporaryFile({ extension: 'env' })
    await fs.writeFile(dotenvFile, `# comment line`)
    const repository = new DotenvRepository({ dotenvFile })
    // act
    const settings = await repository.read()
    // assert
    assert.isEmpty(settings)
  })

  it('should return values from dotenv file', async function () {
    // arrange
    const dotenvFile = temporaryFile({ extension: 'env' })
    await fs.writeFile(dotenvFile, `# comment line
NAME1=VALUE1
NAME2=
name3='value#3'
NAME4="multi
line
value"
name5=\`value5\`
`)
    const repository = new DotenvRepository({ dotenvFile })
    // act
    const settings = await repository.read()
    // assert
    assert.lengthOf(settings, 5)
    assert.equal(settings.get('NAME1'), 'VALUE1')
    assert.equal(settings.get('NAME2'), '')
    assert.equal(settings.get('name3'), 'value#3')
    assert.equal(settings.get('NAME4'), 'multi\nline\nvalue')
    assert.equal(settings.get('name5'), 'value5')
  })

  it('should write values to dotenv file', async function () {
    // arrange
    const dotenvFile = temporaryFile({ extension: 'env' })
    const repository = new DotenvRepository({ dotenvFile })
    // act
    const incoming = new Map()
    incoming.set('NAME1', 'VALUE1')
    incoming.set('NAME2', '')
    incoming.set('BOOL8', true)
    incoming.set('NULL9', null)
    incoming.set('NUM10', 12345)
    incoming.set('name3', 'value#3')
    incoming.set('NAME4', "multi\nline\nvalue")
    await repository.write(incoming)
    const settings = await repository.read()
    // assert
    assert.lengthOf(settings, 7)
    assert.equal(settings.get('NAME1'), 'VALUE1')
    assert.equal(settings.get('NAME2'), '')
    assert.equal(settings.get('BOOL8'), 'true')
    assert.equal(settings.get('NULL9'), 'null')
    assert.equal(settings.get('NUM10'), 12345)
    assert.equal(settings.get('name3'), 'value#3')
    assert.equal(settings.get('NAME4'), 'multi\nline\nvalue')
  })

  it('should read and write PEM encoded certificates', async function () {
    // arrange
    const dotenvFile = temporaryFile({ extension: 'env' })
    const repository = new DotenvRepository({ dotenvFile })
    const rawCertificate = `-----BEGIN CERTIFICATE-----
MIIErDCCApQCCQCVmh2sP3DTFTANBgkqhkiG9w0BAQsFADAYMRYwFAYDVQQDDA1G
o/mqlYGsRE1PiIpwZ6gYLcQGeelJb3HNB4pHde5DHURNjPlEBMZOGhd+w6fLWNSP
-----END CERTIFICATE-----`
    // act
    const incoming = new Map()
    incoming.set('IDP_CERT', rawCertificate)
    await repository.write(incoming)
    const settings = await repository.read()
    // assert
    assert.lengthOf(settings, 1)
    assert.equal(settings.get('IDP_CERT'), rawCertificate)
  })

  it('should read and write XML formatted metadata', async function () {
    // arrange
    const dotenvFile = temporaryFile({ extension: 'env' })
    const repository = new DotenvRepository({ dotenvFile })
    // somewhat realistic IdP metadata with quotes and newlines; note that the #
    // that would be in the KeyInfo element was removed because dotenv still
    // cannot process that as hoped, see github.com/motdotla/dotenv/issues/631
    const rawMetadata = `
<EntityDescriptor entityID="urn:p4ever.example.com" xmlns="urn:oasis:names:tc:SAML:2.0:metadata">
  <IDPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <KeyDescriptor use="signing">
      <KeyInfo xmlns="http://www.w3.org/2000/09/xmldsig">
        <X509Data>
          <X509Certificate>MIIC+zO+03/lT/EK+XT+DV/78=</X509Certificate>
        </X509Data>
      </KeyInfo>
    </KeyDescriptor>
    <SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="https://p4ever.example.com/samlp/WPHyLwfzGHdC0g76CksZ4hKmqn0iIGJ3/logout"/>
    <NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</NameIDFormat>
    <SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="https://p4ever.example.com/samlp/WPHyLwfzGHdC0g76CksZ4hKmqn0iIGJ3"/>
    <Attribute Name="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri" FriendlyName="E-Mail Address" xmlns="urn:oasis:names:tc:SAML:2.0:assertion"/>
  </IDPSSODescriptor>
</EntityDescriptor>`
    // act
    const incoming = new Map()
    incoming.set('SAML_IDP_METADATA', rawMetadata)
    await repository.write(incoming)
    const settings = await repository.read()
    // assert
    assert.lengthOf(settings, 1)
    assert.equal(settings.get('SAML_IDP_METADATA'), rawMetadata)
  })
})
