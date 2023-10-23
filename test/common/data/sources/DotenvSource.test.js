//
// Copyright 2023 Perforce Software
//
import { AssertionError } from 'node:assert'
import * as fs from 'node:fs/promises'
import { assert } from 'chai'
import { describe, it } from 'mocha'
import { temporaryFile } from 'tempy'
import { DotenvSource } from 'helix-auth-svc/lib/common/data/sources/DotenvSource.js'

describe('DotenvSource', function () {
  it('should raise an error for invalid input', function () {
    const repository = new DotenvSource({ dotenvFile: '.env' })
    assert.throws(() => repository.write(), AssertionError)
    assert.throws(() => repository.write(null), AssertionError)
  })

  it('should indicate lack of support for collections', function () {
    const repository = new DotenvSource({ dotenvFile: '.env' })
    assert.isFalse(repository.supportsCollections())
  })

  it('should return empty set for missing file', async function () {
    // arrange
    const repository = new DotenvSource({ dotenvFile: 'nosuchfile.env' })
    // act
    const settings = await repository.read()
    // assert
    assert.isEmpty(settings)
  })

  it('should return empty set for "empty" file', async function () {
    // arrange
    const dotenvFile = temporaryFile({ extension: 'env' })
    await fs.writeFile(dotenvFile, `# comment line`)
    const repository = new DotenvSource({ dotenvFile })
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
    const repository = new DotenvSource({ dotenvFile })
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
    const repository = new DotenvSource({ dotenvFile })
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
    const repository = new DotenvSource({ dotenvFile })
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
    const repository = new DotenvSource({ dotenvFile })
    // somewhat realistic IdP metadata with quotes and hashes that would
    // normally cause problems for the dotenv library when reading the file
    const rawMetadata = `<?xml version="1.0"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" entityID="https://app.onelogin.com/saml/metadata/a4987734-9edc-4103-a60b-53cecdb8dc95">
  <IDPSSODescriptor xmlns:ds="http://www.w3.org/2000/09/xmldsig#" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <KeyDescriptor use="signing">
      <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
        <ds:X509Data>
          <ds:X509Certificate>MIID3zCCAsegAwIBAgIUd9ChnI/jbY/XlxedqJtnPbcX3KgwDQYJKoZIhvcNAQEF
BQAwRjERMA8GA1UECgwIUGVyZm9yY2UxFTATBgNVBAsMDE9uZUxvZ2luIElkUDEa
O9orWujuheWVQ5F9CG/+S3MZVB/SA96+aAKUiALtTmqNxqFnCWri2b6xdtNIfo0r
wBEfTUEuM0BRuVU0ABUN+//TrnE3U1NJGsXesXu27Ngfhdc=</ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </KeyDescriptor>
    <SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="https://perforce-dev.onelogin.com/trust/saml2/http-redirect/slo/947859"/>
      <NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</NameIDFormat>
    <SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="https://perforce-dev.onelogin.com/trust/saml2/http-redirect/sso/a4987734-9edc-4103-a60b-53cecdb8dc95"/>
    <SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="https://perforce-dev.onelogin.com/trust/saml2/http-post/sso/a4987734-9edc-4103-a60b-53cecdb8dc95"/>
    <SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:SOAP" Location="https://perforce-dev.onelogin.com/trust/saml2/soap/sso/a4987734-9edc-4103-a60b-53cecdb8dc95"/>
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

  it('should read and write metadata within JSON', async function () {
    // arrange
    const dotenvFile = temporaryFile({ extension: 'env' })
    const repository = new DotenvSource({ dotenvFile })
    // somewhat realistic IdP metadata with quotes and hashes that would
    // normally cause problems for the dotenv library when reading the file
    const providers = [{
      spEntityId: 'urn:example:sp',
      protocol: 'saml',
      metadata: `<?xml version="1.0"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" entityID="https://app.onelogin.com/saml/metadata/a4987734-9edc-4103-a60b-53cecdb8dc95">
  <IDPSSODescriptor xmlns:ds="http://www.w3.org/2000/09/xmldsig#" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <KeyDescriptor use="signing">
      <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
        <ds:X509Data>
          <ds:X509Certificate>MIID3zCCAsegAwIBAgIUd9ChnI/jbY/XlxedqJtnPbcX3KgwDQYJKoZIhvcNAQEF
BQAwRjERMA8GA1UECgwIUGVyZm9yY2UxFTATBgNVBAsMDE9uZUxvZ2luIElkUDEa
O9orWujuheWVQ5F9CG/+S3MZVB/SA96+aAKUiALtTmqNxqFnCWri2b6xdtNIfo0r
wBEfTUEuM0BRuVU0ABUN+//TrnE3U1NJGsXesXu27Ngfhdc=</ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </KeyDescriptor>
    <SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="https://perforce-dev.onelogin.com/trust/saml2/http-redirect/slo/947859"/>
      <NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</NameIDFormat>
    <SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="https://perforce-dev.onelogin.com/trust/saml2/http-redirect/sso/a4987734-9edc-4103-a60b-53cecdb8dc95"/>
    <SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="https://perforce-dev.onelogin.com/trust/saml2/http-post/sso/a4987734-9edc-4103-a60b-53cecdb8dc95"/>
    <SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:SOAP" Location="https://perforce-dev.onelogin.com/trust/saml2/soap/sso/a4987734-9edc-4103-a60b-53cecdb8dc95"/>
  </IDPSSODescriptor>
</EntityDescriptor>`
    }]
    // act
    const incoming = new Map()
    incoming.set('AUTH_PROVIDERS', JSON.stringify({ providers }))
    await repository.write(incoming)
    const settings = await repository.read()
    // assert
    assert.lengthOf(settings, 1)
    const actual = JSON.parse(settings.get('AUTH_PROVIDERS'))
    assert.deepEqual(actual.providers, providers)
  })
})
