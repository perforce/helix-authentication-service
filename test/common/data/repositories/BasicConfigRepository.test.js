//
// Copyright 2024 Perforce Software
//
import * as fs from 'node:fs/promises'
import { assert } from 'chai'
import { describe, it } from 'mocha'
import { temporaryFile } from 'tempy'
import { DotenvSource } from 'helix-auth-svc/lib/common/data/sources/DotenvSource.js'
import { TomlSource } from 'helix-auth-svc/lib/common/data/sources/TomlSource.js'
import { BasicConfigRepository } from 'helix-auth-svc/lib/common/data/repositories/BasicConfigRepository.js'

describe('BasicConfigRepository', function () {
  it('should raise an error for invalid input', async function () {
    const source = new DotenvSource({ dotenvFile: '.env' })
    const repository = new BasicConfigRepository({ configSource: source })
    try {
      await repository.write()
      assert.fail('should have raised exception')
    } catch (err) {
      assert.equal(err.message, 'basic: settings must be defined')
    }
    try {
      await repository.write(null)
      assert.fail('should have raised exception')
    } catch (err) {
      assert.equal(err.message, 'basic: settings must be defined')
    }
  })

  it('should return empty set for missing .env file', async function () {
    // arrange
    const source = new DotenvSource({ dotenvFile: 'nosuchfile.env' })
    const repository = new BasicConfigRepository({ configSource: source })
    // act
    const settings = await repository.read()
    // assert
    assert.isEmpty(settings)
  })

  it('should return empty set for missing TOML file', async function () {
    // arrange
    const source = new TomlSource({ tomlFile: 'nosuchfile.toml' })
    const repository = new BasicConfigRepository({ configSource: source })
    // act
    const settings = await repository.read()
    // assert
    assert.isEmpty(settings)
  })

  it('should return empty set for "empty" .env file', async function () {
    // arrange
    const dotenvFile = temporaryFile({ extension: 'env' })
    await fs.writeFile(dotenvFile, `# comment line`)
    const source = new DotenvSource({ dotenvFile })
    const repository = new BasicConfigRepository({ configSource: source })
    // act
    const settings = await repository.read()
    // assert
    assert.isEmpty(settings)
  })

  it('should return empty set for "empty" TOML file', async function () {
    // arrange
    const tomlFile = temporaryFile({ extension: 'toml' })
    await fs.writeFile(tomlFile, `# comment line`)
    const source = new TomlSource({ tomlFile })
    const repository = new BasicConfigRepository({ configSource: source })
    // act
    const settings = await repository.read()
    // assert
    assert.isEmpty(settings)
  })

  it('should return values from .env file', async function () {
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
    const source = new DotenvSource({ dotenvFile })
    const repository = new BasicConfigRepository({ configSource: source })
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

  it('should set LOGGING to "none" (.env)', async function () {
    // arrange
    const dotenvFile = temporaryFile({ extension: 'env' })
    await fs.writeFile(dotenvFile, 'LOGGING=none')
    const source = new DotenvSource({ dotenvFile })
    const repository = new BasicConfigRepository({ configSource: source })
    // act
    const settings = await repository.read()
    // assert
    assert.lengthOf(settings, 1)
    assert.isTrue(settings.has('LOGGING'))
    assert.typeOf(settings.get('LOGGING'), 'string')
    assert.equal(settings.get('LOGGING'), 'none')
  })

  it('should load LOGGING from file (.env)', async function () {
    // arrange
    const dotenvFile = temporaryFile({ extension: 'env' })
    await fs.writeFile(dotenvFile, 'LOGGING=logging.config.cjs')
    const source = new DotenvSource({ dotenvFile })
    const repository = new BasicConfigRepository({ configSource: source })
    // act
    const settings = await repository.read()
    // assert
    assert.lengthOf(settings, 2) // LOGGING and LOGGING_FILE
    assert.isTrue(settings.has('LOGGING'))
    assert.typeOf(settings.get('LOGGING'), 'string')
    assert.include(settings.get('LOGGING'), 'auth-svc.log')
  })

  it('should load LOGGING (encoded) contents (.env)', async function () {
    // arrange
    const dotenvFile = temporaryFile({ extension: 'env' })
    // base64 encoded logging config with 'debug' and 'console'
    await fs.writeFile(dotenvFile, 'LOGGING=base64:bW9kdWxlLmV4cG9ydHMgPSB7CiAgbGV2ZWw6ICdkZWJ1ZycsCiAgdHJhbnNwb3J0OiAnY29uc29sZScKfQo=')
    const source = new DotenvSource({ dotenvFile })
    const repository = new BasicConfigRepository({ configSource: source })
    // act
    const settings = await repository.read()
    // assert
    assert.lengthOf(settings, 1)
    assert.isTrue(settings.has('LOGGING'))
    assert.typeOf(settings.get('LOGGING'), 'string')
    assert.include(settings.get('LOGGING'), 'console')
  })

  it('should set LOGGING to "none" (TOML)', async function () {
    // arrange
    const tomlFile = temporaryFile({ extension: 'toml' })
    await fs.writeFile(tomlFile, 'logging = "none"')
    const source = new TomlSource({ tomlFile })
    const repository = new BasicConfigRepository({ configSource: source })
    // act
    const settings = await repository.read()
    // assert
    assert.lengthOf(settings, 1)
    assert.isTrue(settings.has('LOGGING'))
    assert.typeOf(settings.get('LOGGING'), 'string')
    assert.equal(settings.get('LOGGING'), 'none')
  })

  it('should load LOGGING from file (TOML)', async function () {
    // arrange
    const tomlFile = temporaryFile({ extension: 'toml' })
    await fs.writeFile(tomlFile, 'logging = "logging.config.cjs"')
    const source = new TomlSource({ tomlFile })
    const repository = new BasicConfigRepository({ configSource: source })
    // act
    const settings = await repository.read()
    // assert
    assert.lengthOf(settings, 2) // LOGGING and LOGGING_FILE
    assert.isTrue(settings.has('LOGGING'))
    assert.typeOf(settings.get('LOGGING'), 'string')
    assert.include(settings.get('LOGGING'), 'auth-svc.log')
  })

  it('should load LOGGING contents (TOML)', async function () {
    // arrange
    const tomlFile = temporaryFile({ extension: 'toml' })
    await fs.writeFile(tomlFile, `[logging]
level = 'info'
transport = 'file'
[logging.file]
filename = 'auth-svc.log'
maxsize = 1048576
maxfiles = 4
`)
    const source = new TomlSource({ tomlFile })
    const repository = new BasicConfigRepository({ configSource: source })
    // act
    const settings = await repository.read()
    // assert
    assert.lengthOf(settings, 1)
    assert.isTrue(settings.has('LOGGING'))
    const logging = settings.get('LOGGING')
    assert.typeOf(logging, 'object')
    assert.propertyVal(logging.file, 'filename', 'auth-svc.log')
  })

  it('should return values from TOML file', async function () {
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
    const source = new TomlSource({ tomlFile })
    const repository = new BasicConfigRepository({ configSource: source })
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

  it('should write values to .env file', async function () {
    // arrange
    const dotenvFile = temporaryFile({ extension: 'env' })
    const source = new DotenvSource({ dotenvFile })
    const repository = new BasicConfigRepository({ configSource: source })
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

  it('should read and write PEM encoded certificates (.env)', async function () {
    // arrange
    const dotenvFile = temporaryFile({ extension: 'env' })
    const source = new DotenvSource({ dotenvFile })
    const repository = new BasicConfigRepository({ configSource: source })
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

  it('should read and write XML formatted metadata (.env)', async function () {
    // arrange
    const dotenvFile = temporaryFile({ extension: 'env' })
    const source = new DotenvSource({ dotenvFile })
    const repository = new BasicConfigRepository({ configSource: source })
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

  it('should read/write secrets in files if appropriate (.env)', async function () {
    // arrange
    const secretFile = temporaryFile({ extension: 'txt' })
    await fs.writeFile(secretFile, 'lioness')
    const dotenvFile = temporaryFile({ extension: 'env' })
    const source = new DotenvSource({ dotenvFile })
    const repository = new BasicConfigRepository({ configSource: source })
    // act
    const incoming = new Map()
    incoming.set('OIDC_CLIENT_SECRET', 'tiger')
    incoming.set('OIDC_CLIENT_SECRET_FILE', secretFile)
    incoming.set('KEY_PASSPHRASE', 'housecat')
    await repository.write(incoming)
    const settings = await repository.read()
    // assert
    assert.lengthOf(settings, 2)
    assert.isFalse(settings.has('KEY_PASSPHRASE_FILE'))
    assert.equal(settings.get('KEY_PASSPHRASE'), 'housecat')
    assert.isTrue(settings.has('OIDC_CLIENT_SECRET_FILE'))
    assert.isFalse(settings.has('OIDC_CLIENT_SECRET'))
    const secret = await fs.readFile(secretFile, 'utf8')
    assert.equal(secret, 'tiger')
  })

  it('should read/write secrets in files if appropriate (TOML)', async function () {
    // arrange
    const secretFile = temporaryFile({ extension: 'txt' })
    await fs.writeFile(secretFile, 'lioness')
    const tomlFile = temporaryFile({ extension: 'env' })
    const source = new TomlSource({ tomlFile })
    const repository = new BasicConfigRepository({ configSource: source })
    // act
    const incoming = new Map()
    incoming.set('OIDC_CLIENT_SECRET', 'tiger')
    incoming.set('OIDC_CLIENT_SECRET_FILE', secretFile)
    incoming.set('KEY_PASSPHRASE', 'housecat')
    await repository.write(incoming)
    const settings = await repository.read()
    // assert
    assert.lengthOf(settings, 2)
    assert.isFalse(settings.has('KEY_PASSPHRASE_FILE'))
    assert.equal(settings.get('KEY_PASSPHRASE'), 'housecat')
    assert.isTrue(settings.has('OIDC_CLIENT_SECRET_FILE'))
    assert.isFalse(settings.has('OIDC_CLIENT_SECRET'))
    const secret = await fs.readFile(secretFile, 'utf8')
    assert.equal(secret, 'tiger')
  })

  it('should write secrets only if different (.env)', async function () {
    // arrange
    const secretFile = temporaryFile({ extension: 'txt' })
    await fs.writeFile(secretFile, 'lioness\n')
    const dotenvFile = temporaryFile({ extension: 'env' })
    const source = new DotenvSource({ dotenvFile })
    const repository = new BasicConfigRepository({ configSource: source })
    // act
    const incoming = new Map()
    incoming.set('OIDC_CLIENT_SECRET_FILE', secretFile)
    incoming.set('OIDC_CLIENT_SECRET', 'lioness') // note missing trailing newline
    await repository.write(incoming)
    const settings = await repository.read()
    // assert
    assert.lengthOf(settings, 1)
    assert.isTrue(settings.has('OIDC_CLIENT_SECRET_FILE'))
    assert.isFalse(settings.has('OIDC_CLIENT_SECRET'))
    const secret = await fs.readFile(secretFile, 'utf8')
    assert.equal(secret, 'lioness\n')
  })

  it('should write LOGGING=none to .env', async function () {
    // arrange
    const dotenvFile = temporaryFile({ extension: 'env' })
    const source = new DotenvSource({ dotenvFile })
    const repository = new BasicConfigRepository({ configSource: source })
    // act
    const incoming = new Map()
    incoming.set('LOGGING', 'none')
    await repository.write(incoming)
    // assert
    const contents = await fs.readFile(dotenvFile, 'utf8')
    assert.equal(contents, "LOGGING='none'\n")
  })

  it('should write LOGGING=none to TOML', async function () {
    // arrange
    const tomlFile = temporaryFile({ extension: 'toml' })
    const source = new TomlSource({ tomlFile })
    const repository = new BasicConfigRepository({ configSource: source })
    // act
    const incoming = new Map()
    incoming.set('LOGGING', 'none')
    await repository.write(incoming)
    // assert
    const contents = await fs.readFile(tomlFile, 'utf8')
    assert.equal(contents, 'logging = "none"')
  })

  it('should write LOGGING contents to TOML', async function () {
    // arrange
    const tomlFile = temporaryFile({ extension: 'toml' })
    const source = new TomlSource({ tomlFile })
    const repository = new BasicConfigRepository({ configSource: source })
    // act
    const incoming = new Map()
    incoming.set('LOGGING', {
      level: 'debug',
      transport: 'console'
    })
    await repository.write(incoming)
    // assert
    const contents = await fs.readFile(tomlFile, 'utf8')
    assert.equal(contents, `[logging]
level = "debug"
transport = "console"`)
  })

  it('should write auth providers configuration to .env', async function () {
    // arrange
    const dotenvFile = temporaryFile({ extension: 'env' })
    const source = new DotenvSource({ dotenvFile })
    const repository = new BasicConfigRepository({ configSource: source })
    // act
    const incoming = new Map()
    incoming.set('AUTH_PROVIDERS', [{
      label: 'Acme Identity',
      protocol: 'saml',
      metadataUrl: 'https://saml1.example.com'
    }, {
      label: 'Coyote Security',
      protocol: 'saml',
      metadataUrl: 'https://saml2.example.com'
    }])
    await repository.write(incoming)
    const settings = await repository.read()
    assert.lengthOf(settings, 1)
    assert.isTrue(settings.has('AUTH_PROVIDERS'))
    // assert
    const providers = settings.get('AUTH_PROVIDERS')
    assert.equal(providers[0].label, 'Acme Identity')
    assert.equal(providers[0].protocol, 'saml')
    assert.equal(providers[0].metadataUrl, 'https://saml1.example.com')
    assert.notProperty(providers[0], 'id')
    assert.equal(providers[1].label, 'Coyote Security')
    assert.equal(providers[1].protocol, 'saml')
    assert.equal(providers[1].metadataUrl, 'https://saml2.example.com')
    assert.notProperty(providers[1], 'id')
  })

  it('should write auth providers configuration to TOML', async function () {
    // arrange
    const tomlFile = temporaryFile({ extension: 'toml' })
    const source = new TomlSource({ tomlFile })
    const repository = new BasicConfigRepository({ configSource: source })
    // act
    const incoming = new Map()
    incoming.set('AUTH_PROVIDERS', [{
      label: 'Acme Identity',
      protocol: 'saml',
      metadataUrl: 'https://saml1.example.com'
    }, {
      label: 'Coyote Security',
      protocol: 'saml',
      metadataUrl: 'https://saml2.example.com'
    }])
    await repository.write(incoming)
    const settings = await repository.read()
    assert.lengthOf(settings, 1)
    assert.isTrue(settings.has('AUTH_PROVIDERS'))
    // assert
    const providers = settings.get('AUTH_PROVIDERS')
    assert.equal(providers[0].label, 'Acme Identity')
    assert.equal(providers[0].protocol, 'saml')
    assert.equal(providers[0].metadataUrl, 'https://saml1.example.com')
    assert.notProperty(providers[0], 'id')
    assert.equal(providers[1].label, 'Coyote Security')
    assert.equal(providers[1].protocol, 'saml')
    assert.equal(providers[1].metadataUrl, 'https://saml2.example.com')
    assert.notProperty(providers[1], 'id')
  })

  it('should write auth providers to a file (.env)', async function () {
    // arrange
    const dotenvFile = temporaryFile({ extension: 'env' })
    const source = new DotenvSource({ dotenvFile })
    const repository = new BasicConfigRepository({ configSource: source })
    const providersFile = temporaryFile({ extension: 'json' })
    // act
    const incoming = new Map()
    incoming.set('AUTH_PROVIDERS', [{
      label: 'Acme Identity',
      protocol: 'saml',
      metadataUrl: 'https://saml1.example.com'
    }, {
      label: 'Coyote Security',
      protocol: 'saml',
      metadataUrl: 'https://saml2.example.com'
    }])
    incoming.set('AUTH_PROVIDERS_FILE', providersFile)
    await repository.write(incoming)
    const settings = await repository.read()
    assert.lengthOf(settings, 2)
    assert.isTrue(settings.has('AUTH_PROVIDERS_FILE'))
    assert.isTrue(settings.has('AUTH_PROVIDERS'))
    // assert
    const contents = await fs.readFile(providersFile, 'utf8')
    const providers = JSON.parse(contents).providers
    assert.equal(providers[0].label, 'Acme Identity')
    assert.equal(providers[0].protocol, 'saml')
    assert.equal(providers[0].metadataUrl, 'https://saml1.example.com')
    assert.notProperty(providers[0], 'id')
    assert.equal(providers[1].label, 'Coyote Security')
    assert.equal(providers[1].protocol, 'saml')
    assert.equal(providers[1].metadataUrl, 'https://saml2.example.com')
    assert.notProperty(providers[1], 'id')
  })

  it('should write auth providers as embedded (TOML)', async function () {
    // arrange
    const tomlFile = temporaryFile({ extension: 'toml' })
    const source = new TomlSource({ tomlFile })
    const repository = new BasicConfigRepository({ configSource: source })
    // act
    const incoming = new Map()
    incoming.set('AUTH_PROVIDERS', [{
      label: 'Acme Identity',
      protocol: 'saml',
      metadataUrl: 'https://saml1.example.com'
    }, {
      label: 'Coyote Security',
      protocol: 'saml',
      metadataUrl: 'https://saml2.example.com'
    }])
    incoming.set('AUTH_PROVIDERS_FILE', 'providers.json')
    await repository.write(incoming)
    const settings = await repository.read()
    assert.lengthOf(settings, 1)
    assert.isTrue(settings.has('AUTH_PROVIDERS'))
    // assert
    const providers = settings.get('AUTH_PROVIDERS')
    assert.equal(providers[0].label, 'Acme Identity')
    assert.equal(providers[0].protocol, 'saml')
    assert.equal(providers[0].metadataUrl, 'https://saml1.example.com')
    assert.notProperty(providers[0], 'id')
    assert.equal(providers[1].label, 'Coyote Security')
    assert.equal(providers[1].protocol, 'saml')
    assert.equal(providers[1].metadataUrl, 'https://saml2.example.com')
    assert.notProperty(providers[1], 'id')
  })

  it('should read/write LOGGING when "none" (.env)', async function () {
    // arrange
    const dotenvFile = temporaryFile({ extension: 'env' })
    await fs.writeFile(dotenvFile, 'LOGGING=none')
    const source = new DotenvSource({ dotenvFile })
    const repository = new BasicConfigRepository({ configSource: source })
    // act
    const settings = await repository.read()
    // assert
    assert.lengthOf(settings, 1)
    assert.isTrue(settings.has('LOGGING'))
    assert.typeOf(settings.get('LOGGING'), 'string')
    assert.equal(settings.get('LOGGING'), 'none')
    // act
    await repository.write(settings)
    // assert
    const contents = await fs.readFile(dotenvFile, 'utf8')
    assert.equal(contents, "LOGGING='none'\n")
  })

  it('should read/write LOGGING as file (.env)', async function () {
    // arrange
    const loggingFile = temporaryFile({ extension: 'cjs' })
    await fs.writeFile(loggingFile, `module.exports = {
  level: 'debug',
  transport: 'console'
}`)
    const dotenvFile = temporaryFile({ extension: 'env' })
    await fs.writeFile(dotenvFile, `LOGGING=${loggingFile}`)
    const source = new DotenvSource({ dotenvFile })
    const repository = new BasicConfigRepository({ configSource: source })
    // act
    const settings = await repository.read()
    // assert
    assert.lengthOf(settings, 2) // LOGGING and LOGGING_FILE
    assert.isTrue(settings.has('LOGGING'))
    assert.typeOf(settings.get('LOGGING'), 'string')
    assert.include(settings.get('LOGGING'), "transport: 'console'")
    // act
    await repository.write(settings)
    // assert
    const contents = await fs.readFile(dotenvFile, 'utf8')
    assert.equal(contents, `LOGGING='${loggingFile}'\n`)
  })

  it('should read/write LOGGING changes to file (.env)', async function () {
    // arrange
    const loggingFile = temporaryFile({ extension: 'cjs' })
    await fs.writeFile(loggingFile, `module.exports = {
  level: 'debug',
  transport: 'console'
}`)
    const dotenvFile = temporaryFile({ extension: 'env' })
    await fs.writeFile(dotenvFile, `LOGGING=${loggingFile}`)
    const source = new DotenvSource({ dotenvFile })
    const repository = new BasicConfigRepository({ configSource: source })
    // act
    const settings = await repository.read()
    // assert
    assert.lengthOf(settings, 2) // LOGGING and LOGGING_FILE
    assert.isTrue(settings.has('LOGGING'))
    assert.typeOf(settings.get('LOGGING'), 'string')
    assert.include(settings.get('LOGGING'), "level: 'debug'")
    // act
    settings.set('LOGGING', `module.exports = {
  level: 'info',
  transport: 'console'
}`)
    await repository.write(settings)
    // assert
    const contents = await fs.readFile(dotenvFile, 'utf8')
    assert.equal(contents, `LOGGING='${loggingFile}'\n`)
    const logconfig = await fs.readFile(loggingFile, 'utf8')
    assert.include(logconfig, "level: 'info'")
  })

  it('should read/write LOGGING when "none" (TOML)', async function () {
    // arrange
    const tomlFile = temporaryFile({ extension: 'toml' })
    await fs.writeFile(tomlFile, 'logging = "none"')
    const source = new TomlSource({ tomlFile })
    const repository = new BasicConfigRepository({ configSource: source })
    // act
    const settings = await repository.read()
    // assert
    assert.lengthOf(settings, 1)
    assert.isTrue(settings.has('LOGGING'))
    assert.typeOf(settings.get('LOGGING'), 'string')
    assert.equal(settings.get('LOGGING'), 'none')
    // act
    await repository.write(settings)
    // assert
    const contents = await fs.readFile(tomlFile, 'utf8')
    assert.equal(contents, 'logging = "none"')
  })

  it('should read/write LOGGING as file (TOML)', async function () {
    // arrange
    const loggingFile = temporaryFile({ extension: 'cjs' })
    await fs.writeFile(loggingFile, `module.exports = {
  level: 'debug',
  transport: 'console'
}`)
    const tomlFile = temporaryFile({ extension: 'toml' })
    await fs.writeFile(tomlFile, `logging = "${loggingFile}"`)
    const source = new TomlSource({ tomlFile })
    const repository = new BasicConfigRepository({ configSource: source })
    // act
    const settings = await repository.read()
    // assert
    assert.lengthOf(settings, 2) // LOGGING and LOGGING_FILE
    assert.isTrue(settings.has('LOGGING'))
    assert.typeOf(settings.get('LOGGING'), 'string')
    assert.include(settings.get('LOGGING'), "transport: 'console'")
    // act
    await repository.write(settings)
    // assert
    const contents = await fs.readFile(tomlFile, 'utf8')
    assert.equal(contents, `logging = "${loggingFile}"`)
  })

  it('should read/write LOGGING changes to file (TOML)', async function () {
    // arrange
    const loggingFile = temporaryFile({ extension: 'cjs' })
    await fs.writeFile(loggingFile, `module.exports = {
  level: 'debug',
  transport: 'console'
}`)
    const tomlFile = temporaryFile({ extension: 'toml' })
    await fs.writeFile(tomlFile, `logging = "${loggingFile}"`)
    const source = new TomlSource({ tomlFile })
    const repository = new BasicConfigRepository({ configSource: source })
    // act
    const settings = await repository.read()
    // assert
    assert.lengthOf(settings, 2) // LOGGING and LOGGING_FILE
    assert.isTrue(settings.has('LOGGING'))
    assert.typeOf(settings.get('LOGGING'), 'string')
    assert.include(settings.get('LOGGING'), "level: 'debug'")
    // act
    settings.set('LOGGING', `module.exports = {
  level: 'info',
  transport: 'console'
}`)
    await repository.write(settings)
    // assert
    const contents = await fs.readFile(tomlFile, 'utf8')
    assert.equal(contents, `logging = "${loggingFile}"`)
    const logconfig = await fs.readFile(loggingFile, 'utf8')
    assert.include(logconfig, "level: 'info'")
  })
})
