//
// Copyright 2022 Perforce Software
//
import * as assert from 'node:assert'

/**
 * Read the configuration for which the service acts as identity provider.
 *
 * @return {Promise} resolves to object with IdP configuration.
 * @throws {Error} if validation fails for any reason.
 */
export default ({ settingsRepository }) => {
  assert.ok(settingsRepository, 'settingsRepository must be defined')
  return async () => {
    const defaultIdpConfigFile = 'helix-auth-svc/routes/saml_idp.conf.cjs'
    const configuredConfigFile = settingsRepository.get('IDP_CONFIG_FILE')
    const idpConfFile = configuredConfigFile || defaultIdpConfigFile
    const module = await import(idpConfFile)
    return module.default
  }
}
