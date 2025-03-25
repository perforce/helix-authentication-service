//
// Copyright 2024 Perforce Software
//
import * as fs from 'node:fs/promises'
import { assert } from 'chai'
import { before, describe, it } from 'mocha'
import { temporaryFile } from 'tempy'
import { BasicConfigRepository } from 'helix-auth-svc/lib/common/data/repositories/BasicConfigRepository.js'
import { DefaultsEnvRepository } from 'helix-auth-svc/lib/common/data/repositories/DefaultsEnvRepository.js'
import { EnvSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/EnvSettingsRepository.js'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'
import { MergedSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MergedSettingsRepository.js'
import { TomlSource } from 'helix-auth-svc/lib/common/data/sources/TomlSource.js'

describe('MergedSettingsRepository', function () {
  describe('Basic merging', function () {
    const temporary = new MapSettingsRepository()
    const source = {
      readSync() {
        return new Map()
      }
    }
    const cfg = new BasicConfigRepository({ configSource: source })
    const dotenv = new EnvSettingsRepository({ configurationRepository: cfg })
    const defaults = new DefaultsEnvRepository()
    const sut = new MergedSettingsRepository({
      temporaryRepository: temporary,
      configuredRepository: dotenv,
      defaultsRepository: defaults
    })

    it('should return string or undefined from get()', function () {
      temporary.set('FROM_TEMP', 'temp_value')
      process.env['MSR_FROM_PROC'] = 'proc_value'
      assert.equal(sut.get('MSR_FROM_PROC'), 'proc_value')
      assert.equal(sut.get('FROM_TEMP'), 'temp_value')
      assert.equal(sut.get('SESSION_SECRET'), 'keyboard cat')
      assert.isUndefined(sut.get('SETTING_UNDEFINED'))
    })

    it('should return true or false from has()', function () {
      temporary.set('FROM_TEMP', 'temp_value')
      process.env['MSR_FROM_PROC'] = 'proc_value'
      assert.isTrue(sut.has('MSR_FROM_PROC'))
      assert.isTrue(sut.has('FROM_TEMP'))
      assert.isTrue(sut.has('OIDC_SELECT_ACCOUNT'))
      assert.isFalse(sut.has('SETTING_UNDEFINED'))
    })

    it('should return true or false from getBool()', function () {
      process.env['MSR_SETTING_TRUE'] = 'true'
      process.env['MSR_SETTING_TRUE_UPPER'] = 'TRUE'
      process.env['MSR_SETTING_NONE'] = 'none'
      process.env['MSR_SETTING_FALSE'] = 'false'
      assert.isTrue(sut.getBool('MSR_SETTING_TRUE'))
      assert.isTrue(sut.getBool('MSR_SETTING_TRUE_UPPER'))
      assert.isFalse(sut.getBool('MSR_SETTING_NONE'))
      assert.isFalse(sut.getBool('MSR_SETTING_FALSE'))
      assert.isFalse(sut.getBool('SETTING_UNDEFINED'))
      assert.isFalse(sut.getBool('OIDC_SELECT_ACCOUNT'))
    })

    it('should return value or fallback from getInt()', function () {
      process.env['MSR_SETTING_3000'] = '3000'
      assert.equal(sut.getInt('MSR_SETTING_3000', 100), 3000)
      assert.equal(sut.getInt('MSR_SETTING_NONE', 101), 101)
    })

    it('should allow shadowing via tempoary', function () {
      temporary.set('MSR_SHADOW_NAME', 'temp_value')
      process.env['MSR_SHADOW_NAME'] = 'proc_value'
      assert.equal(sut.get('MSR_SHADOW_NAME'), 'temp_value')
    })

    it('should write changes to temporary repo', function () {
      sut.set('MSR_TEST_BOOL', 'true')
      assert.isTrue(sut.getBool('MSR_TEST_BOOL'))
      sut.set('MSR_TEST_INT', '123')
      assert.equal(sut.get('MSR_TEST_INT'), '123')
      sut.set('MSR_TEST_STR', 'abc')
      assert.equal(sut.get('MSR_TEST_STR'), 'abc')
      // assert that the value did not go into the process repo
      assert.isFalse(dotenv.has('MSR_TEST_BOOL'))
      assert.isFalse(dotenv.has('MSR_TEST_INT'))
      assert.isFalse(dotenv.has('MSR_TEST_STR'))
      // assert that the value was saved to the temporary repo
      assert.isTrue(temporary.has('MSR_TEST_BOOL'))
      assert.isTrue(temporary.has('MSR_TEST_INT'))
      assert.isTrue(temporary.has('MSR_TEST_STR'))
      // no need to assert with defaults, it is not writable
    })
  })

  describe('Reading from TOML', function () {
    const temporary = new MapSettingsRepository()
    let source
    let cfg
    let dotenv
    let defaults
    let sut

    before(async function () {
      const tomlFile = temporaryFile({ extension: 'toml' })
      await fs.writeFile(tomlFile, `# comment line
debug = true
svc_base_uri = 'https://has-test.example.com'

[[auth_providers]]
label = "Azure"
issuer_uri = 'https://azure.example.com'
client_id = 'azure-client-id'
client_secret = 'azure-client-secret'

[[auth_providers]]
label = "OneLogin"
metadata_url = 'https://onelogin.example.com/saml/metadata'
audience = 'urn:example:sp'
sp_entity_id = 'https://has-test.example.com'
`)
      source = new TomlSource({ tomlFile })
      cfg = new BasicConfigRepository({ configSource: source })
      dotenv = new EnvSettingsRepository({ configurationRepository: cfg })
      defaults = new DefaultsEnvRepository()
      sut = new MergedSettingsRepository({
        temporaryRepository: temporary,
        configuredRepository: dotenv,
        defaultsRepository: defaults
      })
    })

    it('should read auth providers without injecting wrong properties', function () {
      const providers = sut.get('AUTH_PROVIDERS')
      assert.isArray(providers)
      assert.lengthOf(providers, 2)
      assert.isTrue(providers.some((e) => Object.hasOwn(e, 'issuerUri')))
      assert.isTrue(providers.some((e) => Object.hasOwn(e, 'metadataUrl')))
      for (const entry of providers) {
        if (Object.hasOwn(entry, 'metadataUrl')) {
          assert.hasAllKeys(entry, ['audience', 'label', 'spEntityId', 'metadataUrl'])
          assert.propertyVal(entry, 'label', 'OneLogin')
          assert.propertyVal(entry, 'metadataUrl', 'https://onelogin.example.com/saml/metadata')
        } else if (Object.hasOwn(entry, 'issuerUri')) {
          assert.hasAllKeys(entry, ['label', 'clientId', 'clientSecret', 'issuerUri'])
          assert.propertyVal(entry, 'label', 'Azure')
          assert.propertyVal(entry, 'clientId', 'azure-client-id')
          assert.propertyVal(entry, 'clientSecret', 'azure-client-secret')
          assert.propertyVal(entry, 'issuerUri', 'https://azure.example.com')
        }
      }
    })
  })
})
