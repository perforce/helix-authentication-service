//
// Copyright 2022 Perforce Software
//
import * as fs from 'node:fs'

// Asynchronously load the Redis Sentinel configuration via top-level await.
async function loadSentinelConfig () {
  if (process.env.SENTINEL_CONFIG_FILE) {
    const module = await import(process.env.SENTINEL_CONFIG_FILE)
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

const sentinel = loadSentinelConfig()

// standardjs does not yet understand top-level await, but eventually
export default await sentinel
