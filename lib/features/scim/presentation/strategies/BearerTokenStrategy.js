//
// Copyright 2022 Perforce Software
//
import { Strategy } from 'passport-http-bearer'
import container from 'helix-auth-svc/lib/container.js'

const settings = container.resolve('settingsRepository')

/**
 * Create a passport Strategy to validate an API token.
 */
export default () => {
  return new Strategy(
    (token, done) => {
      // refresh settings to allow for changes at runtime
      const bearerTokenRaw = settings.get('BEARER_TOKEN')
      const bearerToken = Buffer.from(bearerTokenRaw, 'utf-8').toString('base64')
      if (token !== bearerToken) {
        return done(null, false)
      }
      // for non-user specific access, create a placeholder "user" object
      const user = {
        userName: 'test'
      }
      return done(null, user, { scope: 'all' })
    }
  )
}
