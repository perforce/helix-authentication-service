//
// Copyright 2022 Perforce Software
//
import * as assert from 'node:assert'

/**
 * Load the SAML authentication context configuration, if any. The returned
 * value will always a list, even for a single value, as the SAML client library
 * only accepts a list as input.
 *
 * @returns {Array} list of SAML authn context values, or undefined if none.
 */
export default ({ settingsRepository }) => {
  assert.ok(settingsRepository, 'settings repository must be defined')
  return () => {
    let ctx = settingsRepository.get('SAML_AUTHN_CONTEXT')
    if (ctx) {
      // No SAML authn context can have brackets ([]), commas, spaces, or quotes
      // in them, so if a comma is present, then treat that input as an encoded
      // list. Strip everything that shouldn't be there and split on the commas.
      if (typeof ctx === 'string' && ctx.includes(',')) {
        return ctx.replace(/[ "'[\]]/g, '').split(',').map((c) => c.trim()).filter((c) => c.length)
      }
      if (Array.isArray(ctx)) {
        return ctx
      }
      return [ctx]
    }
    return undefined
  }
}
