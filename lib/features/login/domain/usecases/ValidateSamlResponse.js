//
// Copyright 2022 Perforce Software
//
import * as assert from 'node:assert'
import { SAML } from '@node-saml/node-saml'

/**
 * Validate the SAML assertion received from the client application. The `body`
 * should contain a single property named `SAMLResponse` that comes from the
 * HTTP request sent to the service.
 *
 * @param {Object} options - SAML IdP options used to validate the assertion.
 * @param {String} body - HTTP requset body that contains the SAML assertion.
 * @return {Object} contains the user `profile` and the original `requestId`.
 * @throws {Error} if validation fails for any reason.
 */
export default () => {
  return async (options, body) => {
    assert.ok(options, 'validate-saml-resp: options must be defined')
    assert.ok(body, 'validate-saml-resp: body must be defined')
    const saml = new SAML(options)
    const { profile } = await saml.validatePostResponseAsync(body)
    // profile will contain nameID and sessionIndex
    return {
      profile,
      requestId: profile.sessionIndex
    }
  }
}
