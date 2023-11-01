//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'
import { Strategy } from 'passport-http-bearer'

/**
 * Create a passport Strategy to validate an API token.
 */
export default ({ getProvisioningDomains }) => {
  assert.ok(getProvisioningDomains, 'getProvisioningDomains must be defined')
  return new Strategy((token, done) => {
    getProvisioningDomains().then((providers) => {
      for (const provider of providers) {
        const bearerTokenPlain = provider.bearerToken.trim()
        const bearerTokenCipher = Buffer.from(bearerTokenPlain, 'utf-8').toString('base64')
        if (bearerTokenCipher === token) {
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
