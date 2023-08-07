//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'
import { oidcNameMapping, samlNameMapping } from 'helix-auth-svc/lib/constants.js'

/**
 * Remove the classic OIDC/SAML settings if AUTH_PROVIDERS is defined. This is
 * the opposite of ConvertFromProviders, which attempts to fold a single OIDC
 * and/or SAML provider into classic settings.
 *
 * @param {Map} settings - Map-like object containing all settings.
 */
export default () => {
  return async (settings, options = { shadow: false }) => {
    assert.ok(settings, 'settings must be provided')
    const deleteFn = options.shadow ?
      (name) => settings.set(name, undefined) :
      (name) => settings.delete(name)
    if (settings.has('AUTH_PROVIDERS')) {
      // remove classic OIDC settings
      for (const env of Object.keys(oidcNameMapping)) {
        deleteFn(env)
      }
      // remove classic SAML settings
      for (const env of Object.keys(samlNameMapping)) {
        deleteFn(env)
      }
    }
  }
}
