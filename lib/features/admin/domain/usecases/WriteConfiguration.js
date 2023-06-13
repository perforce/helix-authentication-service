//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'
import * as fs from 'node:fs/promises'
import { ulid } from 'ulid'
import {
  blockedSettings,
  oidcNameMapping,
  renamedSettings,
  samlNameMapping
} from 'helix-auth-svc/lib/constants.js'

// names of settings which contain XML data stored in .xml files
const xmlDataFiles = {
  'SAML_IDP_METADATA_FILE': 'SAML_IDP_METADATA'
}

// names of settings which contain TLS certificates stored in .pem files
// (and can be written to, which excludes the public/private key pairs)
const certificateFiles = {
  'CA_CERT_FILE': 'CA_CERT',
  'IDP_CERT_FILE': 'IDP_CERT'
}

// names of settings that may be written to files if appropriate
const maybeFileSettings = {
  'AUTH_PROVIDERS_FILE': 'AUTH_PROVIDERS',
  'KEY_PASSPHRASE_FILE': 'KEY_PASSPHRASE',
  'OIDC_CLIENT_SECRET_FILE': 'OIDC_CLIENT_SECRET',
}

/**
 * Write the (partial) configuration settings to the repository.
 *
 * @param {Map} settings - partial or complete collection of settings.
 */
export default ({ configRepository, defaultsRepository, convertFromProviders }) => {
  assert.ok(configRepository, 'configRepository must be defined')
  assert.ok(defaultsRepository, 'defaultsRepository must be defined')
  assert.ok(convertFromProviders, 'convertFromProviders must be defined')
  return async (incoming) => {
    const settings = await configRepository.read()
    // elide any settings deemed a security risk
    for (const keyname of blockedSettings) {
      incoming.delete(keyname)
    }
    // fold the incoming settings into the current, removing any settings whose
    // values are empty strings
    incoming.forEach((value, key) => {
      if (value === '') {
        settings.delete(key)
      } else {
        settings.set(key, value)
      }
    })
    await convertFromProviders(settings)
    // remove settings with old names when new names are also present
    for (const [oldname, newname] of Object.entries(renamedSettings)) {
      if (settings.has(oldname) && settings.has(newname)) {
        settings.delete(oldname)
      }
    }
    // Convert the AUTH_PROVIDERS value from a list into an object. Also remove
    // the `id` property from each provider to allow for consistent and
    // predictable assignment across multiple instances of the service.
    formatAuthProviders(settings, defaultsRepository)
    // filter any settings that equal the defaults
    filterDefaults(settings, defaultsRepository)
    // write XML data to files when possible
    await writeValueToFile(settings, xmlDataFiles, 'data', 'xml')
    // write certificates to files when possible
    await writeValueToFile(settings, certificateFiles, 'cert-or-key', 'pem')
    // write secrets to files if appropriate
    await maybeWriteToFile(settings, maybeFileSettings)
    if (settings.has('IDP_CONFIG')) {
      if (!settings.has('IDP_CONFIG_FILE')) {
        // generate a random filename to hold the configuration (random only to
        // avoid colliding with any other files)
        settings.set('IDP_CONFIG_FILE', `idp-config-${ulid()}.cjs`)
      }
      const filename = settings.get('IDP_CONFIG_FILE')
      const config = settings.get('IDP_CONFIG')
      const formatted = `module.exports = ${JSON.stringify(config, null, 2)}\n`
      await fs.writeFile(filename, formatted)
      settings.delete('IDP_CONFIG')
    }
    await configRepository.write(settings)
  }
}

function filterDefaults(settings, defaults) {
  settings.forEach((value, key) => {
    if (defaults.has(key)) {
      // intentionally using == to detect more duplicates (e.g. 1 == '1')
      // although it will not catch everything (e.g. false == 'false')
      const defawlt = defaults.get(key)
      if (defawlt == value || defawlt === value.toString()) {
        settings.delete(key)
      }
    }
  })
}

// Always write the value to a file, even if the file setting is missing.
async function writeValueToFile(settings, mapping, prefix, extension) {
  for (const [filekey, valuekey] of Object.entries(mapping)) {
    if (!settings.has(filekey) && settings.has(valuekey)) {
      // generate a random filename to hold the value (random only to avoid
      // colliding with any other files)
      settings.set(filekey, `${prefix}-${ulid()}.${extension}`)
    }
    if (settings.has(filekey) && settings.has(valuekey)) {
      await writeIfDifferent(settings, filekey, valuekey)
    }
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

function formatAuthProviders(settings, defaults) {
  if (settings.has('AUTH_PROVIDERS')) {
    const content = settings.get('AUTH_PROVIDERS')
    const anonymous = content.map((p) => {
      // remove the identifier that is only assigned at runtime
      const clone = Object.assign({}, p)
      delete clone.id
      // filter default values
      const mapping = p.protocol === 'oidc' ? oidcNameMapping : samlNameMapping
      for (const [env, prov] of Object.entries(mapping)) {
        if (defaults.has(env) && p[prov] !== undefined) {
          const value = p[prov]
          // intentionally using == to detect more duplicates (e.g. 1 == '1')
          // although it will not catch everything (e.g. false == 'false')
          const defawlt = defaults.get(env)
          if (defawlt == value || defawlt === value.toString()) {
            delete clone[prov]
          }
        }
      }
      return clone
    })
    const formatted = { providers: anonymous }
    settings.set('AUTH_PROVIDERS', JSON.stringify(formatted))
  }
}
