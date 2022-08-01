//
// Copyright 2022 Perforce Software
//
import { Strategy } from 'passport-http-bearer'
import container from 'helix-auth-svc/lib/container.js'

const validateWebToken = container.resolve('validateWebToken')

/**
 * Create a passport Strategy to validate a JSON web token.
 */
export default () => {
  return new Strategy((token, done) => {
    validateWebToken(token).then((payload) => {
        if (payload === null) {
          done(null, false)
        } else {
          // the JWT payload is our "user"
          done(null, payload, { scope: 'all' })
        }
      }).catch((err) => done(err))
    }
  )
}
