//
// Copyright 2022 Perforce Software
//
import { Strategy } from 'passport-http-bearer'
import container from 'helix-auth-svc/lib/container.js'

const validateCredentials = container.resolve('validateCredentials')

/**
 * Create a passport Strategy to validate username:password.
 */
export default () => {
  return new Strategy((token, done) => {
    const decoded = Buffer.from(token, 'base64').toString()
    const colonIdx = decoded.indexOf(':')
    if (colonIdx > 0) {
      const username = decoded.substring(0, colonIdx)
      const password = decoded.substring(colonIdx + 1)
      if (validateCredentials(username, password)) {
        done(null, { username }, { scope: 'all' })
      } else {
        done(null, false)
      }
    } else {
      done(new Error('invalid username:password value'))
    }
  })
}
