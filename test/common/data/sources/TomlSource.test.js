//
// Copyright 2023 Perforce Software
//
import { AssertionError } from 'node:assert'
const { createHash } = await import('node:crypto')
import * as fs from 'node:fs/promises'
import { assert } from 'chai'
import { describe, it } from 'mocha'
import { temporaryFile } from 'tempy'
import { TomlSource } from 'helix-auth-svc/lib/common/data/sources/TomlSource.js'

describe('TomlSource', function () {
  it('should raise an error for invalid input', function () {
    const repository = new TomlSource({ tomlFile: 'config.toml' })
    assert.throws(() => repository.write(), AssertionError)
    assert.throws(() => repository.write(null), AssertionError)
  })

  it('should indicate support for data collections', function () {
    const repository = new TomlSource({ tomlFile: 'config.toml' })
    assert.isTrue(repository.supportsCollections())
  })

  it('should return empty set for missing file', async function () {
    // arrange
    const repository = new TomlSource({ tomlFile: 'nosuchfile.toml' })
    // act
    const settings = await repository.read()
    // assert
    assert.isEmpty(settings)
  })

  it('should return empty set for nearly empty file', async function () {
    // arrange
    const tomlFile = temporaryFile({ extension: 'toml' })
    await fs.writeFile(tomlFile, `# comment line`)
    const repository = new TomlSource({ tomlFile })
    // act
    const settings = await repository.read()
    // assert
    assert.isEmpty(settings)
  })

  it('should return values from toml file', async function () {
    // arrange
    const tomlFile = temporaryFile({ extension: 'toml' })
    await fs.writeFile(tomlFile, `# comment line
strvalue = 'value1'
numvalue = 12345
boolvalue = false
multiline = """
Roses are red
Violets are blue"""
trimmed = """\\
  The quick brown \\
  fox jumps over \\
  the lazy dog.\\
  """
hashed = 'value#3'
`)
    const repository = new TomlSource({ tomlFile })
    // act
    const settings = await repository.read()
    // assert
    assert.lengthOf(settings, 6)
    assert.equal(settings.get('STRVALUE'), 'value1')
    assert.equal(settings.get('NUMVALUE'), 12345)
    assert.equal(settings.get('BOOLVALUE'), false)
    assert.equal(settings.get('HASHED'), 'value#3')
    assert.equal(settings.get('MULTILINE'), 'Roses are red\nViolets are blue')
    assert.equal(settings.get('TRIMMED'), 'The quick brown fox jumps over the lazy dog.')
  })

  it('should convert from TOML naming convention', async function () {
    // arrange
    const tomlFile = temporaryFile({ extension: 'toml' })
    await fs.writeFile(tomlFile, `# comment line
debug = true
svc_base_uri = 'https://has.example.com'

[[auth_providers]]
issuer_uri = 'https://oidc.example.com'
client_id = 'client-id'
client_secret = 'client-secret'

[logging]
level = 'info'
transport = 'file'
[logging.file]
filename = 'auth-svc.log'
maxsize = 1048576
maxfiles = 4

[idp_config.should_not_convert_this]
acs_url = 'https://swarm.example.com/api/v10/session'

[idp_config.'urn:swarm-multiple:sp']
acs_urls = [
  'http://swarm.example.com/chicago/api/v10/session',
  'http://swarm.example.com/tokyo/api/v10/session'
]

[provisioning]
[[provisioning.providers]]
bearer_token_file = "feline-token.txt"
domain = "feline"

[[provisioning.servers]]
p4port = "ssl:chicago:1666"
p4user = "super"
p4passwd = "2E7092CC2CA6BCAC74EB364BF4C4AD99"
domains = [ "feline" ]
leader = [ "feline" ]
`)
    const repository = new TomlSource({ tomlFile })
    // act
    const settings = await repository.read()
    // assert
    assert.lengthOf(settings, 6)
    assert.equal(settings.get('DEBUG'), true)
    assert.equal(settings.get('SVC_BASE_URI'), 'https://has.example.com')
    const providers = settings.get('AUTH_PROVIDERS')
    assert.isArray(providers)
    assert.lengthOf(providers, 1)
    assert.hasAllKeys(providers[0], ['issuerUri', 'clientId', 'clientSecret'])
    const logging = settings.get('LOGGING')
    assert.equal(logging.level, 'info')
    assert.equal(logging.file.filename, 'auth-svc.log')
    const idpConfig = settings.get('IDP_CONFIG')
    assert.property(idpConfig, 'should_not_convert_this')
    assert.property(idpConfig.should_not_convert_this, 'acsUrl')
    assert.equal(idpConfig.should_not_convert_this.acsUrl, 'https://swarm.example.com/api/v10/session')
    assert.property(idpConfig, 'urn:swarm-multiple:sp')
    assert.property(idpConfig['urn:swarm-multiple:sp'], 'acsUrls')
    assert.isArray(idpConfig['urn:swarm-multiple:sp'].acsUrls)
    assert.lengthOf(idpConfig['urn:swarm-multiple:sp'].acsUrls, 2)
    assert.equal(idpConfig['urn:swarm-multiple:sp'].acsUrls[0], 'http://swarm.example.com/chicago/api/v10/session')
    assert.equal(idpConfig['urn:swarm-multiple:sp'].acsUrls[1], 'http://swarm.example.com/tokyo/api/v10/session')
    const provisioning = settings.get('PROVISIONING')
    assert.isArray(provisioning.providers)
    assert.lengthOf(provisioning.providers, 1)
    assert.property(provisioning.providers[0], 'bearerTokenFile')
    assert.property(provisioning.providers[0], 'domain')
    assert.isArray(provisioning.servers)
    assert.lengthOf(provisioning.servers, 1)
    assert.isArray(provisioning.servers[0].domains)
    assert.lengthOf(provisioning.servers[0].domains, 1)
  })

  it('should be okay with ENV naming convention', async function () {
    // arrange
    const tomlFile = temporaryFile({ extension: 'toml' })
    await fs.writeFile(tomlFile, `# comment line
DEBUG = true
SVC_BASE_URI = 'https://has.example.com'

[[AUTH_PROVIDERS]]
issuerUri = 'https://oidc.example.com'
clientId = 'client-id'
clientSecret = 'client-secret'

[LOGGING]
level = 'info'
transport = 'file'
[LOGGING.file]
filename = 'auth-svc.log'
maxsize = 1048576
maxfiles = 4

[IDP_CONFIG.should_not_convert_this]
acsUrl = 'https://swarm.example.com/api/v10/session'

[IDP_CONFIG.'urn:swarm-multiple:sp']
acsUrls = [
  'http://swarm.example.com/chicago/api/v10/session',
  'http://swarm.example.com/tokyo/api/v10/session'
]
`)
    const repository = new TomlSource({ tomlFile })
    // act
    const settings = await repository.read()
    // assert
    assert.lengthOf(settings, 5)
    assert.equal(settings.get('DEBUG'), true)
    assert.equal(settings.get('SVC_BASE_URI'), 'https://has.example.com')
    const providers = settings.get('AUTH_PROVIDERS')
    assert.isArray(providers)
    assert.lengthOf(providers, 1)
    assert.hasAllKeys(providers[0], ['issuerUri', 'clientId', 'clientSecret'])
    const logging = settings.get('LOGGING')
    assert.equal(logging.level, 'info')
    assert.equal(logging.file.filename, 'auth-svc.log')
    const idpConfig = settings.get('IDP_CONFIG')
    assert.property(idpConfig, 'should_not_convert_this')
    assert.property(idpConfig.should_not_convert_this, 'acsUrl')
    assert.equal(idpConfig.should_not_convert_this.acsUrl, 'https://swarm.example.com/api/v10/session')
    assert.property(idpConfig, 'urn:swarm-multiple:sp')
    assert.property(idpConfig['urn:swarm-multiple:sp'], 'acsUrls')
    assert.isArray(idpConfig['urn:swarm-multiple:sp'].acsUrls)
    assert.lengthOf(idpConfig['urn:swarm-multiple:sp'].acsUrls, 2)
    assert.equal(idpConfig['urn:swarm-multiple:sp'].acsUrls[0], 'http://swarm.example.com/chicago/api/v10/session')
    assert.equal(idpConfig['urn:swarm-multiple:sp'].acsUrls[1], 'http://swarm.example.com/tokyo/api/v10/session')
  })

  it('should convert from ENV naming convention', async function () {
    // arrange
    const tomlFile = temporaryFile({ extension: 'toml' })
    const repository = new TomlSource({ tomlFile })
    // act
    const incoming = new Map()
    incoming.set('DEBUG', true)
    incoming.set('SVC_BASE_URI', 'https://has.example.com')
    incoming.set('auth_providers', [
      {
        issuerUri: 'https://oidc.example.com',
        clientId: 'client-id',
        clientSecret: 'client-secret'
      }
    ])
    incoming.set('LOGGING', {
      level: 'info',
      transport: 'file',
      file: {
        filename: 'auth-svc.log',
        maxsize: 1048576,
        maxfiles: 4
      }
    })
    incoming.set('IDP_CONFIG', {
      should_not_convert_this: {
        acsUrl: 'https://swarm.example.com/api/v10/session'
      },
      'urn:swarm-multiple:sp': {
        acsUrls: [
          'http://swarm.example.com/chicago/api/v10/session',
          'http://swarm.example.com/tokyo/api/v10/session'
        ]
      }
    })
    // act
    await repository.write(incoming)
    // assert
    const contents = await fs.readFile(tomlFile, { encoding: 'utf8' })
    const hash = createHash('sha256')
    hash.update(contents)
    const digest = hash.digest('hex')
    // Already visually inspected the output and determined that it is correct,
    // now just asserting that by using a hash digest of the contents.
    assert.equal(digest, '4e263730d8c8384f0c70b6c0844a2a1086114987641863b252b1ed0ecd9eda6e')
  })

  it('should round-trip settings via toml file', async function () {
    // arrange
    const tomlFile = temporaryFile({ extension: 'toml' })
    const repository = new TomlSource({ tomlFile })
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
    assert.lengthOf(settings, 6)
    assert.equal(settings.get('NAME1'), 'VALUE1')
    assert.equal(settings.get('NAME2'), '')
    assert.equal(settings.get('BOOL8'), true)
    assert.isFalse(settings.has('NULL9'))
    assert.equal(settings.get('NUM10'), 12345)
    assert.equal(settings.get('NAME3'), 'value#3')
    assert.equal(settings.get('NAME4'), 'multi\nline\nvalue')
  })

  it('should read and write PEM encoded certificates', async function () {
    // arrange
    const tomlFile = temporaryFile({ extension: 'toml' })
    const repository = new TomlSource({ tomlFile })
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
    const tomlFile = temporaryFile({ extension: 'toml' })
    const repository = new TomlSource({ tomlFile })
    // somewhat realistic IdP metadata with quotes and hashes that could cause
    // problems for certain file formats such as dotenv
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

  it('should read and write metadata within providers', async function () {
    // arrange
    const tomlFile = temporaryFile({ extension: 'toml' })
    const repository = new TomlSource({ tomlFile })
    // somewhat realistic IdP metadata with quotes and hashes that could cause
    // problems for certain file formats such as dotenv
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
    // Intentinally _not_ formatting the providers into JSON as that defeats the
    // value of using TOML versus dotenv file format. Also, formatting as JSON
    // seems to confuse smol-toml and it produces an error.
    incoming.set('AUTH_PROVIDERS', providers)
    await repository.write(incoming)
    const settings = await repository.read()
    // assert
    assert.lengthOf(settings, 1)
    const actual = settings.get('AUTH_PROVIDERS')
    assert.deepEqual(actual, providers)
  })
})
