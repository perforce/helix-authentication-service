//
// Copyright 2022 Perforce Software
//
import { Strategy } from 'passport-http-bearer'
import container from 'helix-auth-svc/lib/container.js'

const verifyWebToken = container.resolve('verifyWebToken')

/**
 * Create a passport Strategy to validate a JSON web token.
 */
export default () => {
  return new Strategy((token, done) => {
      verifyWebToken(token).then((payload) => {
        if (payload === null) {
          done(null, false)
        } else {
          // use the web token payload as a user object
          done(null, payload, { scope: 'all' })
        }
      }).catch((err) => done(err))
    }
  )
}
