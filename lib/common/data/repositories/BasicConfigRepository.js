//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'
import { readFileSync } from 'node:fs'
import * as fs from 'node:fs/promises'
import { ConfigurationRepository } from 'helix-auth-svc/lib/common/domain/repositories/ConfigurationRepository.js'

// Those settings that might appear inside a configuration file that supports
// collections (e.g. TOML), and thus should be read into the settings if they
// are still specified using the _FILE setting.
//
// Other file-based settings may be public/private key pairs, binary files, or
// the value is a file glob and not a filename. As such, these are ignored.
const maybeFileSettingsRead = {
  'AUTH_PROVIDERS_FILE': 'AUTH_PROVIDERS',
  'IDP_CONFIG_FILE': 'IDP_CONFIG',
  'SAML_IDP_METADATA_FILE': 'SAML_IDP_METADATA',
  'SENTINEL_CONFIG_FILE': 'SENTINEL_CONFIG',
}

// Those settings that can be changed and subsequently be written to their
// corresponding files, if any such _FILE setting has already been defined.
const maybeFileSettingsWrite = {
  'AUTH_PROVIDERS_FILE': 'AUTH_PROVIDERS',
  'IDP_CONFIG_FILE': 'IDP_CONFIG',
  'KEY_PASSPHRASE_FILE': 'KEY_PASSPHRASE',
  'OIDC_CLIENT_SECRET_FILE': 'OIDC_CLIENT_SECRET',
  'SAML_IDP_METADATA_FILE': 'SAML_IDP_METADATA',
  'SENTINEL_CONFIG_FILE': 'SENTINEL_CONFIG',
}

//
// Configuration repository implementation for reading and writing configuration
// data within either .env or config.toml, determined by the given data source.
// Any settings that refer to files will have their values read and parsed into
// a setting with the appropriate name.
//
class BasicConfigRepository extends ConfigurationRepository {
  constructor({ configSource }) {
    super()
    assert.ok(configSource, 'basic: configSource is required')
    this._configSource = configSource
  }

  // returns a promise
  async read() {
    const settings = await this._configSource.read()
    return this.parseSettings(settings)
  }

  readSync() {
    return this.parseSettings(this._configSource.readSync())
  }

  // returns a promise
  async write(settings) {
    assert.ok(settings, 'basic: settings must be defined')
    const formatted = await this.formatSettings(settings)
    return this._configSource.write(formatted)
  }

  // Perform any additional parsing that may be needed for certain values.
  parseSettings(settings) {
    // read file-based settings into corresponding non-file settings
    for (const [filekey, valuekey] of Object.entries(maybeFileSettingsRead)) {
      readFile(settings, filekey, valuekey)
    }
    // Not evaluating JavaScript here as that requires async which cannot be
    // introduced without breaking readSync() which is needed because awilix
    // does not (yet) support async initializers.
    const logging = settings.get('LOGGING')
    if (typeof logging === 'string' && logging !== 'none') {
      readFile(settings, 'LOGGING', 'LOGGING')
    }
    if (this._configSource.supportsCollections()) {
      // no additional parsing is required for this data source
      return settings
    }
    // For sources that do not support collections, and whose settings may be
    // embedded directly in the configuration file, we have some additional
    // parsing to perform.
    const content = settings.get('AUTH_PROVIDERS')
    if (content && typeof content === 'string') {
      const parsed = JSON.parse(content)
      if (parsed.providers) {
        settings.set('AUTH_PROVIDERS', parsed.providers)
      }
    }
    return settings
  }

  // Perform any additional formatting that may be needed for certain values.
  async formatSettings(settings) {
    if (!this._configSource.supportsCollections()) {
      const providers = settings.get('AUTH_PROVIDERS')
      if (providers) {
        settings.set('AUTH_PROVIDERS', JSON.stringify({ providers }))
      }
    } else {
      // favor embedded settings over file-based settings
      if (settings.has('AUTH_PROVIDERS') && settings.has('AUTH_PROVIDERS_FILE')) {
        settings.delete('AUTH_PROVIDERS_FILE')
      }
    }
    // write values to files if appropriate
    await maybeWriteToFile(settings, maybeFileSettingsWrite)
    return settings
  }
}

function readFile(settings, filekey, valuekey) {
  const filename = settings.get(filekey)
  if (filename) {
    const content = readFileSync(filename, 'utf8')
    // need to perform parsing for certain settings
    if (valuekey === 'AUTH_PROVIDERS') {
      if (content) {
        const parsed = JSON.parse(content)
        if (parsed.providers) {
          settings.set('AUTH_PROVIDERS', parsed.providers)
        }
      }
    } else {
      settings.set(valuekey, content.trim())
    }
    // leave the file-based setting in place so it can be used when writing the
    // values to persistent storage later
  }
}

// Only write the value to a file if the file setting exists.
async function maybeWriteToFile(settings, mapping) {
  for (const [filekey, valuekey] of Object.entries(mapping)) {
    if (settings.has(filekey) && settings.has(valuekey)) {
      await writeIfDifferent(settings, filekey, valuekey)
    }
  }
}

async function writeIfDifferent(settings, filekey, valuekey) {
  const filename = settings.get(filekey)
  const newvalue = settings.get(valuekey)
  let writeContents = true
  try {
    const oldvalue = await fs.readFile(filename, { encoding: 'utf8' })
    if (newvalue.trim() === oldvalue.trim()) {
      writeContents = false
    }
  } catch (err) {
    // ignored in case file is missing
  }
  if (writeContents) {
    await fs.writeFile(filename, newvalue)
  }
  settings.delete(valuekey)
}

export { BasicConfigRepository }
