//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'
import * as fs from 'node:fs/promises'

/**
 * Construct a configuration object for use with Redis Sentinel.
 *
 * @returns {Object} config object suitable for initializing redis, or null if
 *                   the Redis Sentinel configuration file is not defined.
 */
export default ({ settingsRepository }) => {
  assert.ok(settingsRepository, 'settings repository must be defined')
  return async () => {
    const contents = settingsRepository.get('SENTINEL_CONFIG')
    if (contents) {
      const config = await evaluateContents(contents)
      if (config.tls) {
        const newca = []
        for (const entry of config.tls.ca) {
          const ca = await fs.readFile(entry, 'utf8')
          newca.push(ca)
        }
        config.tls.ca = newca
        config.tls.cert = await fs.readFile(config.tls.cert, 'utf8')
        config.tls.key = await fs.readFile(config.tls.key, 'utf8')
      }
      if (config.sentinelTLS) {
        config.enableTLSForSentinelMode = true
        const newca = []
        for (const entry of config.sentinelTLS.ca) {
          const ca = await fs.readFile(entry, 'utf8')
          newca.push(ca)
        }
        config.sentinelTLS.ca = newca
        config.sentinelTLS.cert = await fs.readFile(config.sentinelTLS.cert, 'utf8')
        config.sentinelTLS.key = await fs.readFile(config.sentinelTLS.key, 'utf8')
      }
      return config
    } else {
      return null
    }
  }
}

async function evaluateContents(contents) {
  if (typeof contents === 'string') {
    // Normalize the input to help Node.js process the configuration. This
    // will take either CommonJS or ES6 and format it as a URI that can be fed
    // to Node.js via the import function using the special 'data' prefix.
    const filtered = contents.split(/\r?\n/).filter(line => !line.trim().startsWith('//'))
    const folded = filtered.map(line => line.trim()).join('')
    const exported = folded.replace('module.exports =', 'export default')
    const encoded = 'data:text/javascript,' + encodeURIComponent(exported)
    const module = await import(encoded)
    return module.default
  }
  // if not a string, then it has already been parsed
  return contents
}
