//
// Copyright 2023 Perforce Software
//

/**
 * Process the SAML authentication context configuration, if any. The returned
 * value will always be a list, even for a single value, as the SAML client
 * library only accepts a list as input.
 *
 * @param {String} ctx - value for the SAML authn context, if any.
 * @returns {Array} list of SAML authn context values, or undefined if none.
 */
export default () => {
  return (ctx) => {
    if (ctx !== undefined) {
      // No SAML authn context can have brackets, commas, spaces, or quotes, so
      // if an open bracket is present, then treat the input as an encoded list.
      // Strip everything that shouldn't be there and split on the commas.
      if (typeof ctx === 'string' && ctx.includes('[')) {
        return ctx.replace(/[ "'[\]]/g, '').split(',').map((c) => c.trim()).filter((c) => c.length)
      }
      if (Array.isArray(ctx)) {
        return ctx.length > 0 ? ctx : undefined
      }
      if (typeof ctx === 'string' && ctx.length > 0) {
        return [ctx]
      }
    }
    return undefined
  }
}
