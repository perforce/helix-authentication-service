//
// Copyright 2022 Perforce Software
//
import * as assert from 'node:assert'

/**
 * Load the SAML authentication context configuration, if any. The returned
 * value will always a list, even for a single value as the SAML client library
 * only accepts a list as input.
 *
 * @returns {Array} list of SAML authn context values, or undefined if none.
 */
export default ({ settingsRepository }) => {
  assert.ok(settingsRepository, 'settings repository must be defined')
  return () => {
    let ctx = settingsRepository.get('SAML_AUTHN_CONTEXT')
    if (ctx) {
      // Square brackets ([]) are not allowed in a SAML authn context, so if they
      // are present, it is a list encoded as a string (as in the .env file).
      if (typeof ctx === 'string' && ctx.includes('[')) {
        ctx = ctx.replace(/^["'](.+(?=["']$))["']$/, '$1').trim()
        ctx = ctx.replace(/^\[(.+(?=\]$))\]$/, '$1')
        const result = ctx.split(',').map((c) => c.trim().replace(/^["'](.+(?=["']$))["']$/, '$1'))
        return result.map((e) => {
          // remove any miscellaneous quotes and brackets; no SAML authn context
          // should have these characters
          e = e.replace(/"/g, '')
          e = e.replace(/'/g, '')
          e = e.replace(/]/g, '')
          e = e.replace(/\[/g, '')
          return e.trim()
        })
      }
      return [ctx]
    }
    return undefined
  }
}
