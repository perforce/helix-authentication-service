//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'
import { oidcNameMapping, samlNameMapping } from 'helix-auth-svc/lib/constants.js'

/**
 * Convert the providers in AUTH_PROVIDERS into classic settings, if one OIDC
 * and SAML provider are defined, otherwise remove any classic OIDC/SAML
 * settings to avoid duplication and confusion.
 *
 * @param {Map} settings - Map-like object containing all settings.
 */
export default ({ tidyAuthProviders }) => {
  assert.ok(tidyAuthProviders, 'tidyAuthProviders must be defined')
  return async (settings) => {
    assert.ok(settings, 'settings must be provided')
    if (settings.has('AUTH_PROVIDERS')) {
      let providers = settings.get('AUTH_PROVIDERS')
      providers = await tidyAuthProviders(providers)
      const incomingCount = providers.length
      const oidcProviders = providers.filter((e) => e.protocol === 'oidc')
      if (oidcProviders.length === 1) {
        // convert the one OIDC provider to standard settings
        convert(settings, oidcProviders[0], oidcNameMapping)
        providers = providers.filter((e) => e.id !== oidcProviders[0].id)
      }
      const samlProviders = providers.filter((e) => e.protocol === 'saml')
      if (samlProviders.length === 1) {
        // convert the one SAML provider to standard settings
        convert(settings, samlProviders[0], samlNameMapping)
        providers = providers.filter((e) => e.id !== samlProviders[0].id)
      }
      if (providers.length === 0) {
        // either no incoming providers or all were converted
        settings.delete('AUTH_PROVIDERS')
      } else if (incomingCount > providers.length) {
        // some providers were converted and the list was altered
        settings.set('AUTH_PROVIDERS', providers)
      }
      if (oidcProviders.length === 0 || oidcProviders.length > 1) {
        // remove classic OIDC settings if nothing was converted
        for (const env of Object.keys(oidcNameMapping)) {
          settings.delete(env)
        }
      }
      if (samlProviders.length === 0 || samlProviders.length > 1) {
        // remove classic SAML settings if nothing was converted
        for (const env of Object.keys(samlNameMapping)) {
          settings.delete(env)
        }
      }
    }
  }
}

function convert(settings, provider, mapping) {
  for (const [env, prov] of Object.entries(mapping)) {
    if (prov in provider && provider[prov] !== '') {
      settings.set(env, provider[prov])
    } else {
      settings.delete(env)
    }
  }
}
