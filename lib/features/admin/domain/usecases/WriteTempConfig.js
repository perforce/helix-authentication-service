//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'
import * as fs from 'node:fs/promises'
import { ulid } from 'ulid'

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

const passwordFiles = {
  'KEY_PASSPHRASE_FILE': 'KEY_PASSPHRASE',
  'OIDC_CLIENT_SECRET_FILE': 'OIDC_CLIENT_SECRET',
}

// Map of names of settings for files that contain JSON-formatted values.
const jsonFiles = {
  'AUTH_PROVIDERS_FILE': 'AUTH_PROVIDERS'
}

/**
 * Write the (partial) configuration settings to a temporary repository.
 *
 * @param {Map} incoming - partial or complete collection of settings.
 */
export default ({ temporaryRepository }) => {
  assert.ok(temporaryRepository, 'write temp: temporaryRepository must be defined')
  return async (incoming) => {
    // elide any settings deemed a security risk
    incoming.delete('ADMIN_ENABLED')
    incoming.delete('ADMIN_USERNAME')
    incoming.delete('ADMIN_PASSWD_FILE')
    incoming.delete('ADMIN_P4_AUTH')
    // fold the incoming settings into the temporary repo
    incoming.forEach((value, key) => {
      temporaryRepository.set(key, value)
    })
    // write XML data to files when possible
    try {
      await writeValueToFile(temporaryRepository, xmlDataFiles, 'data', 'xml')
    } catch (err) {
      console.error(err)
    }
    // write certificates to files when possible
    try {
      await writeValueToFile(temporaryRepository, certificateFiles, 'cert-or-key', 'pem')
    } catch (err) {
      console.error(err)
    }
    // write secrets to files when possible
    try {
      await writeValueToFile(temporaryRepository, passwordFiles, 'secret', 'txt')
    } catch (err) {
      console.error(err)
    }
    if (temporaryRepository.has('IDP_CONFIG')) {
      if (!temporaryRepository.has('IDP_CONFIG_FILE')) {
        // generate a random filename to hold the configuration (random only to
        // avoid colliding with any other files)
        temporaryRepository.set('IDP_CONFIG_FILE', `idp-config-${ulid()}.cjs`)
      }
      const filename = temporaryRepository.get('IDP_CONFIG_FILE')
      const config = temporaryRepository.get('IDP_CONFIG')
      const formatted = `module.exports = ${JSON.stringify(config, null, 2)}\n`
      await fs.writeFile(filename, formatted)
      temporaryRepository.delete('IDP_CONFIG')
    }
    // process JSON-formatted settings vs files
    for (const [filekey, valuekey] of Object.entries(jsonFiles)) {
      const content = temporaryRepository.get(valuekey)
      if (temporaryRepository.has(filekey) && content) {
        // write the incoming value to the existing file
        const filename = temporaryRepository.get(filekey)
        await fs.writeFile(filename, JSON.stringify(content))
        temporaryRepository.delete(valuekey)
      } else if (content) {
        // format the value as a JSON string so it can be safely written to the
        // configuration file
        temporaryRepository.set(valuekey, JSON.stringify(content))
      }
    }
  }
}

async function writeValueToFile (settings, mapping, prefix, extension) {
  for (const [filekey, valuekey] of Object.entries(mapping)) {
    if (!settings.has(filekey) && settings.has(valuekey)) {
      // generate a random filename to hold the value (random only to avoid
      // colliding with any other files)
      settings.set(filekey, `${prefix}-${ulid()}.${extension}`)
    }
    if (settings.has(filekey) && settings.has(valuekey)) {
      const filename = settings.get(filekey)
      const contents = settings.get(valuekey)
      await fs.writeFile(filename, contents)
      settings.delete(valuekey)
    }
  }
}
