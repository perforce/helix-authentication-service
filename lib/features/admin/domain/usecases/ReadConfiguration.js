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

/**
 * Read the configuration settings from the repository.
 *
 * @returns {Map} configuration values.
 */
export default ({ configRepository, getIdPConfiguration }) => {
  assert.ok(configRepository, 'read config: configRepository must be defined')
  assert.ok(getIdPConfiguration, 'read config: getIdPConfiguration must be defined')
  return async () => {
    const settings = await configRepository.read()
    // elide any settings deemed a security risk
    settings.delete('ADMIN_ENABLED')
    settings.delete('ADMIN_USERNAME')
    settings.delete('ADMIN_PASSWD_FILE')
    // rename settings from old to new names
    for (const [oldname, newname] of Object.entries(renamedSettings)) {
      if (settings.has(oldname)) {
        settings.set(newname, settings.get(oldname))
        settings.delete(oldname)
      }
    }
    // read password and certificate file contents into corresponding settings
    const fileSettings = Object.entries(passwordFiles).concat(Object.entries(certificateFiles))
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
    if (settings.has('IDP_CONFIG_FILE')) {
      const idpConfig = await getIdPConfiguration()
      settings.set('IDP_CONFIG', idpConfig)
    }
    return settings
  }
}
