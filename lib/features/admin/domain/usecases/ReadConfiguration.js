//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'
import * as fs from 'node:fs/promises'
import { blockedSettings, renamedSettings } from 'helix-auth-svc/lib/constants.js'

// names of settings that might be stored in files
const maybeFileSettings = {
  'SAML_IDP_METADATA_FILE': 'SAML_IDP_METADATA',
  'CA_CERT_FILE': 'CA_CERT',
  'CERT_FILE': 'CERT',
  'IDP_CERT_FILE': 'IDP_CERT',
  'REDIS_CERT_FILE': 'REDIS_CERT',
  'KEY_PASSPHRASE_FILE': 'KEY_PASSPHRASE'
}

// Settings that are no longer exposed to the client because they have been
// converted into some other form by one of the use cases invoked herein.
const migratedSettings = [
  'AUTH_PROVIDERS_FILE',
  'IDP_CERT_FILE',
  'OIDC_CLIENT_ID',
  'OIDC_CLIENT_SECRET_FILE',
  'OIDC_CLIENT_SECRET',
  'OIDC_CODE_CHALLENGE_METHOD',
  'OIDC_INFO_LABEL',
  'OIDC_ISSUER_URI',
  'OIDC_SELECT_ACCOUNT',
  'OIDC_TOKEN_SIGNING_ALGO',
  'SAML_AUTHN_CONTEXT',
  'SAML_DISABLE_CONTEXT',
  'SAML_FORCE_AUTHN',
  'SAML_IDP_ENTITY_ID',
  'SAML_IDP_ISSUER',
  'SAML_IDP_METADATA',
  'SAML_IDP_METADATA_FILE',
  'SAML_IDP_METADATA_URL',
  'SAML_IDP_SLO_URL',
  'SAML_IDP_SSO_URL',
  'SAML_INFO_LABEL',
  'SAML_NAMEID_FORMAT',
  'SAML_SP_AUDIENCE',
  'SAML_SP_ENTITY_ID',
  'SAML_SP_ISSUER',
  'SAML_WANT_ASSERTION_SIGNED',
  'SAML_WANT_RESPONSE_SIGNED',
  'SP_KEY_ALGO'
]

/**
 * Read the configuration settings from the repository.
 *
 * @returns {Map} configuration values.
 */
export default ({
  configRepository,
  temporaryRepository,
  defaultsRepository,
  getIdPConfiguration,
  getAuthProviders
}) => {
  assert.ok(configRepository, 'read config: configRepository must be defined')
  assert.ok(temporaryRepository, 'read config: temporaryRepository must be defined')
  assert.ok(defaultsRepository, 'read config: defaultsRepository must be defined')
  assert.ok(getIdPConfiguration, 'read config: getIdPConfiguration must be defined')
  assert.ok(getAuthProviders, 'read config: getAuthProviders must be defined')
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
    // read temporary settings and overwrite everything else
    const temps = new Map(temporaryRepository.entries())
    temps.forEach((value, key) => {
      settings.set(key, value)
    })
    // elide any settings deemed a security risk
    for (const keyname of blockedSettings) {
      settings.delete(keyname)
    }
    // read data, password, and certificate file contents into corresponding settings
    for (const [filekey, valuekey] of Object.entries(maybeFileSettings)) {
      await readFile(settings, filekey, valuekey)
    }
    const providers = await getAuthProviders()
    settings.set('AUTH_PROVIDERS', providers)
    // special-case SAML integration for Swarm, et al
    if (settings.has('IDP_CONFIG_FILE')) {
      const idpConfig = await getIdPConfiguration()
      settings.set('IDP_CONFIG', idpConfig)
      settings.delete('IDP_CONFIG_FILE')
    }
    // remove any settings that have migrated to some other form
    for (const migrated of migratedSettings) {
      if (settings.has(migrated)) {
        settings.delete(migrated)
      }
    }
    return settings
  }
}

async function readFile(settings, fileKey, valueKey) {
  const filename = settings.get(fileKey)
  if (filename) {
    const contents = await fs.readFile(filename, 'utf8')
    settings.set(valueKey, contents.trim())
    settings.delete(fileKey)
  }
}
