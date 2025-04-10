//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'
import {
  oidcNameMapping,
  samlNameMapping
} from 'helix-auth-svc/lib/constants.js'

/**
 * If AUTH_PROVIDERS has been defined, perform a cleaning of the providers data
 * such that it is ready to be serialized. In particular, remove the identifiers
 * and elide any default values.
 *
 * @param {Map} settings - partial or complete collection of settings.
 */
export default ({ defaultsRepository }) => {
  assert.ok(defaultsRepository, 'defaultsRepository must be defined')
  return (settings) => {
    const providers = settings.get('AUTH_PROVIDERS')
    if (providers) {
      const cleaned = providers.map((p) => {
        // remove the identifier that is only assigned at runtime
        const clone = Object.assign({}, p)
        delete clone.id
        // filter default values, both for OIDC and SAML at the same time
        // because the web client always sends all properites
        filterDefaults(defaultsRepository, oidcNameMapping, clone)
        filterDefaults(defaultsRepository, samlNameMapping, clone)
        // special case of an OIDC provider that has an empty authn_context
        // (again, coming from the web interface)
        if (clone.protocol === 'oidc' && 'authnContext' in clone) {
          delete clone.authnContext
        }
        return clone
      })
      settings.set('AUTH_PROVIDERS', cleaned)
    }
  }
}

function filterDefaults(defaults, mapping, provider) {
  for (const [env, prov] of Object.entries(mapping)) {
    if (defaults.has(env) && provider[prov] !== undefined) {
      const value = provider[prov]
      // undefined or equal to the default is treated equally
      //
      // intentionally using == to detect more duplicates (e.g. 1 == '1')
      // although it will not catch everything (e.g. false == 'false')
      const defawlt = defaults.get(env)
      if (value === undefined || defawlt == value || defawlt === value.toString()) {
        delete provider[prov]
      }
    }
  }
}
