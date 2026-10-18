//
// Copyright 2026 Perforce Software
//
import * as assert from 'node:assert'
import * as crypto from 'node:crypto'
import * as fs from 'node:fs'
import { DEFAULT_SECRET } from 'helix-auth-svc/lib/constants.js'

/**
 * Determine the secret used to sign the session cookie.
 *
 * The secret is read from SESSION_SECRET_FILE if set, otherwise from
 * SESSION_SECRET. The well-known default value is public, so it is treated the
 * same as an unset value; there is no longer a default in defaults.env.
 *
 * When no usable secret has been configured, the behavior depends on whether
 * the session data is shared between service instances. With Redis (or Sentinel)
 * the cookie may be verified by any instance behind a load balancer, so every
 * instance must have the same secret and the service refuses to start rather
 * than silently generate a different one per instance. Without Redis the
 * session store is local to the process, so a random per-process secret is safe.
 *
 * @returns {string} the secret to be used for signing session cookies.
 * @throws {Error} if Redis is in use and no secret has been configured.
 */
export default ({ settingsRepository, logger }) => {
  assert.ok(settingsRepository, 'settingsRepository must be defined')
  assert.ok(logger, 'logger must be defined')
  return () => {
    const secret = readSecret(settingsRepository)
    if (secret && secret !== DEFAULT_SECRET) {
      return secret
    }
    const sharedStore = settingsRepository.get('REDIS_URL') || settingsRepository.get('SENTINEL_CONFIG')
    if (sharedStore) {
      throw new Error(
        'SESSION_SECRET (or SESSION_SECRET_FILE) must be set to a unique value, ' +
        'the same on every service instance, when using Redis. ' +
        'Generate one with: openssl rand -base64 32')
    }
    logger.warning('app: SESSION_SECRET is not set, using a random value that is ' +
      'unique to this process; set SESSION_SECRET if running multiple instances')
    return crypto.randomBytes(32).toString('base64url')
  }
}

function readSecret(settings) {
  const filename = settings.get('SESSION_SECRET_FILE')
  if (filename) {
    return fs.readFileSync(filename, 'utf-8').trim()
  }
  const value = settings.get('SESSION_SECRET')
  return value ? value.trim() : undefined
}
