//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'
import * as fs from 'node:fs'

/**
 * Construct a configuration object for use with Redis Sentinel.
 *
 * @returns {Object} config object suitable for initializing redis, or null if
 *                   the Redis Sentinel configuration file is not defined.
 */
export default ({ settingsRepository }) => {
  assert.ok(settingsRepository, 'settings repository must be defined')
  return async () => {
    const configFilename = settingsRepository.get('SENTINEL_CONFIG_FILE')
    if (configFilename) {
      const module = await import(configFilename)
      const config = module.default
      if (config.tls) {
        config.tls.ca = config.tls.ca.map(f => {
          return fs.readFileSync(f, 'utf-8')
        })
        config.tls.cert = fs.readFileSync(config.tls.cert, 'utf-8')
        config.tls.key = fs.readFileSync(config.tls.key, 'utf-8')
      }
      if (config.sentinelTLS) {
        config.enableTLSForSentinelMode = true
        config.sentinelTLS.ca = config.sentinelTLS.ca.map(f => {
          return fs.readFileSync(f, 'utf-8')
        })
        config.sentinelTLS.cert = fs.readFileSync(config.sentinelTLS.cert, 'utf-8')
        config.sentinelTLS.key = fs.readFileSync(config.sentinelTLS.key, 'utf-8')
      }
      return config
    } else {
      return null
    }
  }
}
