//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'
import * as fs from 'node:fs/promises'
import { ulid } from 'ulid'

// mapping of old names to new names
const renamedSettings = {
  'SAML_SP_ISSUER': 'SAML_SP_ENTITY_ID',
  'SAML_IDP_ISSUER': 'SAML_IDP_ENTITY_ID',
  'SP_CERT_FILE': 'CERT_FILE',
  'SP_KEY_FILE': 'KEY_FILE',
}

// names of settings which contain XML data stored in files
const xmlDataFiles = {
  'SAML_IDP_METADATA_FILE': 'SAML_IDP_METADATA'
}

// names of settings which contain TLS certificates stored in files
const certificateFiles = {
  'CA_CERT_FILE': 'CA_CERT',
  'CERT_FILE': 'CERT',
  'KEY_FILE': 'KEY'
}

// names of settings that may be written to files if appropriate
const passwordFiles = {
  'KEY_PASSPHRASE_FILE': 'KEY_PASSPHRASE',
  'OIDC_CLIENT_SECRET_FILE': 'OIDC_CLIENT_SECRET',
}

// Map of names of settings for files that contain JSON-formatted values.
const jsonFiles = {
  'AUTH_PROVIDERS_FILE': 'AUTH_PROVIDERS'
}

/**
 * Write the (partial) configuration settings to the repository.
 *
 * @param {Map} settings - partial or complete collection of settings.
 */
export default ({ configRepository }) => {
  assert.ok(configRepository, 'write config: repository must be defined')
  return async (incoming) => {
    const settings = await configRepository.read()
    // elide any settings deemed a security risk
    incoming.delete('ADMIN_ENABLED')
    incoming.delete('ADMIN_USERNAME')
    incoming.delete('ADMIN_PASSWD_FILE')
    incoming.delete('ADMIN_P4_AUTH')
    // fold the incoming settings into the current
    incoming.forEach((value, key) => {
      settings.set(key, value)
    })
    // remove any settings whose values are empty strings
    incoming.forEach((value, key) => {
      if (value === '') {
        settings.delete(key)
      }
    })
    // remove settings with old names when new names are also present
    for (const [oldname, newname] of Object.entries(renamedSettings)) {
      if (settings.has(oldname) && settings.has(newname)) {
        settings.delete(oldname)
      }
    }
    // write XML data to files when possible
    try {
      await writeValueToFile(settings, xmlDataFiles, 'data', 'xml')
    } catch (err) {
      console.error(err)
    }
    // write certificates to files when possible
    try {
      await writeValueToFile(settings, certificateFiles, 'cert-or-key', 'pem')
    } catch (err) {
      console.error(err)
    }
    // write secrets to files if appropriate
    try {
      await maybeWriteToFile(settings, passwordFiles)
    } catch (err) {
      console.error(err)
    }
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
    // process JSON-formatted settings vs files
    for (const [filekey, valuekey] of Object.entries(jsonFiles)) {
      const content = settings.get(valuekey)
      if (settings.has(filekey) && content) {
        // write the incoming value to the existing file
        const filename = settings.get(filekey)
        await fs.writeFile(filename, JSON.stringify(content))
        settings.delete(valuekey)
      } else if (content) {
        // format the value as a JSON string so it can be safely written to the
        // configuration file
        settings.set(valuekey, JSON.stringify(content))
      }
    }
    await configRepository.write(settings)
  }
}

// Always write the value to a file, even if the file setting is missing.
async function writeValueToFile (settings, mapping, prefix, extension) {
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
async function maybeWriteToFile (settings, mapping) {
  for (const [filekey, valuekey] of Object.entries(mapping)) {
    if (settings.has(filekey) && settings.has(valuekey)) {
      await writeIfDifferent(settings, filekey, valuekey)
    }
  }
}

async function writeIfDifferent (settings, filekey, valuekey) {
  const filename = settings.get(filekey)
  const newvalue = settings.get(valuekey)
  let writeContents = true
  try {
    const oldvalue = await fs.readFile(filename, { encoding: 'utf8' })
    if (newvalue.trim() === oldvalue.trim()) {
      writeContents = false
    }
  } catch (err) {
    // ignored
  }
  if (writeContents) {
    await fs.writeFile(filename, newvalue)
  }
  settings.delete(valuekey)
}
