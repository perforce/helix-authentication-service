//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'
import crypto from 'node:crypto'
import { Strategy } from 'passport-http-bearer'

// Compare two strings in constant time to avoid leaking how many characters
// matched via timing differences. Both values are hashed to a fixed-length
// digest first so that crypto.timingSafeEqual() never sees differing lengths
// (which would otherwise throw and reveal the length of the expected token).
function constantTimeEqual(a, b) {
  const aDigest = crypto.createHash('sha256').update(String(a)).digest()
  const bDigest = crypto.createHash('sha256').update(String(b)).digest()
  return crypto.timingSafeEqual(aDigest, bDigest)
}

/**
 * Create a passport Strategy to validate an API token.
 */
export default ({ getProvisioningDomains }) => {
  assert.ok(getProvisioningDomains, 'getProvisioningDomains must be defined')
  return new Strategy((token, done) => {
    getProvisioningDomains().then((providers) => {
      for (const provider of providers) {
        const bearerTokenPlain = provider.bearerToken.trim()
        // the token is the base64-encoding of the configured shared secret
        const bearerTokenEncoded = Buffer.from(bearerTokenPlain, 'utf-8').toString('base64')
        if (constantTimeEqual(bearerTokenEncoded, token)) {
          const user = {
            userName: 'unused',
            domain: provider.domain
          }
          return done(null, user, { scope: 'all' })
        }
      }
      // none of the configured providers has a matching token
      done(null, false)
    }).catch((err) => done(err))
  })
}
