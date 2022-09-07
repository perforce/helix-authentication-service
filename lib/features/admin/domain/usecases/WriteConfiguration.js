//
// Copyright 2022 Perforce Software
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

const passwordFiles = {
  'KEY_PASSPHRASE_FILE': 'KEY_PASSPHRASE',
  'OIDC_CLIENT_SECRET_FILE': 'OIDC_CLIENT_SECRET',
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
    // write secrets to files when possible
    for (const [filekey, valuekey] of Object.entries(passwordFiles)) {
      if (!settings.has(filekey) && settings.has(valuekey)) {
        // generate a random filename to hold the secret value (random only to
        // avoid colliding with any other files)
        settings.set(filekey, `secret-${ulid()}.txt`)
      }
      if (settings.has(filekey) && settings.has(valuekey)) {
        try {
          const filename = settings.get(filekey)
          const secret = settings.get(valuekey)
          await fs.writeFile(filename, secret)
          settings.delete(valuekey)
        } catch (err) {
          // ignored
        }
      }
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
    await configRepository.write(settings)
  }
}
