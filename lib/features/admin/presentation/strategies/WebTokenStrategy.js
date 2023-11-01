//
// Copyright 2022 Perforce Software
//
import * as assert from 'node:assert'
import { Strategy } from 'passport-http-bearer'

/**
 * Create a passport Strategy to validate a JSON web token.
 */
export default ({ verifyWebToken }) => {
  assert.ok(verifyWebToken, 'verifyWebToken must be defined')
  return new Strategy((token, done) => {
    verifyWebToken(token).then((payload) => {
      if (payload === null) {
        done(null, false)
      } else {
        // use the web token payload as a user object
        done(null, payload, { scope: 'all' })
      }
    }).catch((err) => done(err))
  })
}
