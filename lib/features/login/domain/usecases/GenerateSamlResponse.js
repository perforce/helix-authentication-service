//
// Copyright 2022 Perforce Software
//
import * as assert from 'node:assert'
import samlp from 'samlp'

/**
 * Generate a SAML assertion with the user and request information.
 *
 * @param {Object} user - user profile data to populate the response.
 * @param {Object} options - options for samlp library to build SAML response.
 * @param {String} requestId - request identifier to include in response.
 * @return {String} generated SAML assertion response.
 * @throws {Error} if generation fails for any reason.
 */
export default () => {
  return (user, options, requestId) => {
    assert.ok(user, 'gen-saml-resp: user must be defined')
    assert.ok(options, 'gen-saml-resp: options must be defined')
    assert.ok(requestId, 'gen-saml-resp: requestId must be defined')
    const profile = buildResponseUser(user)
    const updatedOptions = Object.assign({}, options, {
      // Use the SessionIndex element to transport the request identifier to the
      // service provider, which in turn should send it back to this service for
      // validation, via the client application (e.g. extension).
      sessionIndex: requestId,
      signResponse: true
    })
    return new Promise((resolve, reject) => {
      samlp.getSamlResponse(updatedOptions, profile, (err, resp) => {
        if (err) {
          reject(err)
        } else {
          resolve(resp)
        }
      })
    })
  }
}

// Construct a user object that samlp will accept for building the SAML
// response, and fill in some properties that the service might expect.
function buildResponseUser (user) {
  const email = user.email ? user.email : null
  let displayName = ''
  if (user.fullname) {
    displayName = user.fullname
  } else if (user.name) {
    displayName = user.name
  }
  const givenName = user.given_name ? user.given_name : ''
  const familyName = user.family_name ? user.family_name : ''
  return Object.assign({}, user, {
    id: user.nameID,
    emails: [email],
    displayName,
    name: {
      givenName,
      familyName
    }
  })
}
