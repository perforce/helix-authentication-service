//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'
import { blockedSettings, renamedSettings } from 'helix-auth-svc/lib/constants.js'

// Settings that are no longer exposed to the client because they have been
// converted into some other form by one of the use cases invoked herein.
const migratedSettings = [
  'AUTH_PROVIDERS_FILE',
  'IDP_CERT_FILE',
  'OIDC_CLIENT_ID',
  'OIDC_CLIENT_CERT_FILE',
  'OIDC_CLIENT_CERT',
  'OIDC_CLIENT_KEY_FILE',
  'OIDC_CLIENT_KEY',
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
  configurationRepository,
  temporaryRepository,
  defaultsRepository,
  getAuthProviders
}) => {
  assert.ok(configurationRepository, 'read config: configurationRepository must be defined')
  assert.ok(temporaryRepository, 'read config: temporaryRepository must be defined')
  assert.ok(defaultsRepository, 'read config: defaultsRepository must be defined')
  assert.ok(getAuthProviders, 'read config: getAuthProviders must be defined')
  return async () => {
    // rename settings from old to new names
    const settings = await configurationRepository.read()
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
    const providers = await getAuthProviders({ hideSecrets: true })
    settings.set('AUTH_PROVIDERS', providers)
    // remove any settings that have migrated to some other form
    for (const migrated of migratedSettings) {
      if (settings.has(migrated)) {
        settings.delete(migrated)
      }
    }
    return settings
  }
}
