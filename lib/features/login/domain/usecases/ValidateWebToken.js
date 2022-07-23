//
// Copyright 2022 Perforce Software
//
import * as assert from 'node:assert'
import * as fs from 'node:fs'
import jwksClient from 'jwks-rsa'
import jwt from 'jsonwebtoken'
import { WebToken } from 'helix-auth-svc/lib/common/domain/entities/WebToken.js'

/**
 * Validate the given JSON Web Token based on the application settings.
 *
 * @param {String} token - base64-encoded JSON web token.
 * @return {Object} web token payload as an object.
 * @throws {Error} if validation fails for any reason.
 */
export default ({ settingsRepository }) => {
  assert.ok(settingsRepository, 'settings repository must be defined')
  return async (token) => {
    assert.ok(token, 'validate-token: token must be defined')
    const audience = settingsRepository.get('OAUTH_AUDIENCE')
    const issuer = settingsRepository.get('OAUTH_ISSUER')
    const algorithm = settingsRepository.get('OAUTH_ALGORITHM')
    const tenantId = settingsRepository.get('OAUTH_TENANT_ID')
    const signingKey = await getSigningKey(token, settingsRepository)
    if (signingKey) {
      const options = { algorithms: [algorithm], audience, issuer }
      const payload = jwt.verify(token, signingKey, options)
      if (tenantId) {
        if (tenantId === payload.tid) {
          return payload
        } else {
          throw new Error('tid does not match tenant ID')
        }
      } else {
        return payload
      }
    } else {
      throw new Error('could not find signing key')
    }
  }
}

// Return the value for the 'kid' property in the JWT header, or null if
// anything goes wrong.
function extractKid (jwt) {
  const webToken = WebToken.fromRaw(jwt)
  if (webToken) {
    return webToken.keyid
  }
  return null
}

// Attempt to find the JWT signing key via one of several means.
async function getSigningKey (token, settings) {
  const signingKey = settings.get('OAUTH_SIGNING_KEY_FILE')
  if (signingKey) {
    return fs.readFileSync(signingKey, 'utf-8')
  }
  const jwksUri = settings.get('OAUTH_JWKS_URI')
  if (!jwksUri) {
    throw new Error('missing either OAUTH_JWKS_URI or OAUTH_SIGNING_KEY_FILE settings')
  }
  // the jwks-rsa library will cache the keys for 10 minutes by default
  const client = jwksClient({ jwksUri })
  const jwksKeyid = settings.get('OAUTH_JWKS_KEYID')
  const kid = jwksKeyid ?? extractKid(token)
  if (kid) {
    const key = await client.getSigningKey(kid)
    return key.getPublicKey()
  }
  throw new Error('no `kid` found in JWT header')
}
