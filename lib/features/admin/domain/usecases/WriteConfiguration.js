//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'
import * as fs from 'node:fs/promises'
import {
  blockedSettings,
  renamedSettings
} from 'helix-auth-svc/lib/constants.js'

// names of settings written to files only if the file setting exists
const maybeFileSettings = {
  'SAML_IDP_METADATA_FILE': 'SAML_IDP_METADATA',
  'CA_CERT_FILE': 'CA_CERT',
  'IDP_CERT_FILE': 'IDP_CERT',
  'AUTH_PROVIDERS_FILE': 'AUTH_PROVIDERS',
  'KEY_PASSPHRASE_FILE': 'KEY_PASSPHRASE',
  'OIDC_CLIENT_SECRET_FILE': 'OIDC_CLIENT_SECRET',
}

/**
 * Write the (partial) configuration settings to the repository.
 *
 * @param {Map} settings - partial or complete collection of settings.
 */
export default ({ configRepository, defaultsRepository, convertFromProviders, formatAuthProviders }) => {
  assert.ok(configRepository, 'configRepository must be defined')
  assert.ok(defaultsRepository, 'defaultsRepository must be defined')
  assert.ok(convertFromProviders, 'convertFromProviders must be defined')
  assert.ok(formatAuthProviders, 'formatAuthProviders must be defined')
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
    // convert the AUTH_PROVIDERS value from a list into an object
    formatAuthProviders(settings, defaultsRepository)
    // filter any settings that equal the defaults
    filterDefaults(settings, defaultsRepository)
    // make certain settings safe for dotenv parsing
    encodeSpecialValues(settings)
    // write values to files if appropriate
    await maybeWriteToFile(settings, maybeFileSettings)
    // not supporting the IDP_CONFIG setting for the time being
    // if (settings.has('IDP_CONFIG')) {
    //   if (!settings.has('IDP_CONFIG_FILE')) {
    //     // generate a random filename to hold the configuration (random only to
    //     // avoid colliding with any other files)
    //     settings.set('IDP_CONFIG_FILE', `idp-config-${unique-id}.cjs`)
    //   }
    //   const filename = settings.get('IDP_CONFIG_FILE')
    //   const config = settings.get('IDP_CONFIG')
    //   const formatted = `module.exports = ${JSON.stringify(config, null, 2)}\n`
    //   await fs.writeFile(filename, formatted)
    //   settings.delete('IDP_CONFIG')
    // }
    await configRepository.write(settings)
  }
}

function filterDefaults(settings, defaults) {
  settings.forEach((value, key) => {
    if (defaults.has(key)) {
      // undefined or equal to the default is treated equally
      //
      // intentionally using == to detect more duplicates (e.g. 1 == '1')
      // although it will not catch everything (e.g. false == 'false')
      const defawlt = defaults.get(key)
      if (value === undefined || defawlt == value || defawlt === value.toString()) {
        settings.delete(key)
      }
    }
  })
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

// Certain properties need to be encoded before saving to avoid causing problems
// for either JSON or dotenv parsing. In particular, SAML IdP metadata might
// contain a hash (#) character that causes dotenv to throw an error. Values in
// the `AUTH_PROVIDERS` block are handled elsewhere.
function encodeSpecialValues(settings) {
  if (settings.has('SAML_IDP_METADATA')) {
    const raw = settings.get('SAML_IDP_METADATA')
    const cooked = Buffer.from(raw, 'utf-8').toString('base64')
    settings.set('SAML_IDP_METADATA', cooked)
  }
}
