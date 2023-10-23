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
        // filter default values
        const mapping = p.protocol === 'oidc' ? oidcNameMapping : samlNameMapping
        for (const [env, prov] of Object.entries(mapping)) {
          if (defaultsRepository.has(env) && p[prov] !== undefined) {
            const value = p[prov]
            // undefined or equal to the default is treated equally
            //
            // intentionally using == to detect more duplicates (e.g. 1 == '1')
            // although it will not catch everything (e.g. false == 'false')
            const defawlt = defaultsRepository.get(env)
            if (value === undefined || defawlt == value || defawlt === value.toString()) {
              delete clone[prov]
            }
          }
        }
        return clone
      })
      settings.set('AUTH_PROVIDERS', cleaned)
    }
  }
}
