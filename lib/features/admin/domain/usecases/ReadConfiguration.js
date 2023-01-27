//
// Copyright 2022 Perforce Software
//
import * as assert from 'node:assert'
import * as fs from 'node:fs/promises'

// mapping of old names to new names
const renamedSettings = {
  'SAML_SP_ISSUER': 'SAML_SP_ENTITY_ID',
  'SAML_IDP_ISSUER': 'SAML_IDP_ENTITY_ID',
  'SP_CERT_FILE': 'CERT_FILE',
  'SP_KEY_FILE': 'KEY_FILE',
}

// names of settings which contain data stored in files
const dataFiles = {
  'SAML_IDP_METADATA_FILE': 'SAML_IDP_METADATA'
}

// names of settings which contain TLS certificates stored in files
const certificateFiles = {
  'CA_CERT_FILE': 'CA_CERT',
  'CERT_FILE': 'CERT',
  'KEY_FILE': 'KEY'
}

// Map of names of settings for files that contain secrets and their settings
// that would normally contain the actual value when not using a file.
const passwordFiles = {
  'KEY_PASSPHRASE_FILE': 'KEY_PASSPHRASE',
  'OIDC_CLIENT_SECRET_FILE': 'OIDC_CLIENT_SECRET',
}

// Map of names of settings for files that contain JSON-formatted values.
const jsonFiles = {
  'AUTH_PROVIDERS_FILE': 'AUTH_PROVIDERS'
}

/**
 * Read the configuration settings from the repository.
 *
 * @returns {Map} configuration values.
 */
export default ({ configRepository, defaultsRepository, getIdPConfiguration }) => {
  assert.ok(configRepository, 'read config: configRepository must be defined')
  assert.ok(defaultsRepository, 'read config: defaultsRepository must be defined')
  assert.ok(getIdPConfiguration, 'read config: getIdPConfiguration must be defined')
  return async () => {
    // rename settings from old to new names
    const settings = await configRepository.read()
    for (const [oldname, newname] of Object.entries(renamedSettings)) {
      if (settings.has(oldname)) {
        if (!settings.has(newname)) {
          settings.set(newname, settings.get(oldname))
        }
        settings.delete(oldname)
      }
    }
    // read defaults and merge with configured values
    const defaults = new Map(defaultsRepository.entries())
    defaults.forEach((value, key) => {
      if (!settings.has(key)) {
        settings.set(key, value)
      }
    })
    // elide any settings deemed a security risk
    settings.delete('ADMIN_ENABLED')
    settings.delete('ADMIN_USERNAME')
    settings.delete('ADMIN_PASSWD_FILE')
    settings.delete('ADMIN_P4_AUTH')
    // read data, password, and certificate file contents into corresponding settings
    const fileSettings = Object.entries(passwordFiles).concat(Object.entries(certificateFiles)).concat(Object.entries(dataFiles))
    for (const [filekey, valuekey] of fileSettings) {
      if (settings.has(filekey)) {
        try {
          const filename = settings.get(filekey)
          const contents = await fs.readFile(filename, 'utf8')
          settings.set(valuekey, contents.trim())
        } catch (err) {
          console.error(err)
        }
      }
    }
    // read JSON-formatted file contents into corresponding settings
    for (const [filekey, valuekey] of Object.entries(jsonFiles)) {
      try {
        let content
        if (settings.has(filekey)) {
          content = await fs.readFile(settings.get(filekey), 'utf8')
        } else {
          content = settings.get(valuekey)
        }
        if (content) {
          const parsed = JSON.parse(content)
          if (parsed.providers) {
            settings.set(valuekey, parsed.providers)
          }
        }
      } catch (err) {
        console.error(err)
      }
    }
    // special-case SAML integration for Swarm, et al
    if (settings.has('IDP_CONFIG_FILE')) {
      const idpConfig = await getIdPConfiguration()
      settings.set('IDP_CONFIG', idpConfig)
    }
    return settings
  }
}
