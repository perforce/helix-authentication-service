//
// Copyright 2023 Perforce Software
//
import * as fs from 'node:fs'
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
      const bearerTokenRaw = getBearerToken().trim()
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

function getBearerToken() {
  if (settings.has('BEARER_TOKEN_FILE')) {
    const filename = settings.get('BEARER_TOKEN_FILE')
    return fs.readFileSync(filename, 'utf-8')
  }
  return settings.get('BEARER_TOKEN')
}
