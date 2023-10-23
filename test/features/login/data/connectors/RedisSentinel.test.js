//
// Copyright 2023 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { describe, it } from 'mocha'
import RedisSentinel from 'helix-auth-svc/lib/features/login/data/connectors/RedisSentinel.js'

describe('RedisSentinel connector', function () {
  it('should raise an error for invalid input', function () {
    assert.throws(() => RedisSentinel({ settingsRepository: null }), AssertionError)
  })

  it('should return null if not configured', async function () {
    const connector = RedisSentinel({ settingsRepository: new Map() })
    const result = await connector()
    assert.isNull(result)
  })

  it('should return settings read from text', async function () {
    const settings = new Map()
    const config = `// configuration follows
module.exports = {
  name: 'mymaster',
  // password for connecting to Sentinel (optional)
  sentinelPassword: 'keyboard cat',
  sentinels: [
    { host: '192.168.56.31', port: 26379 },
    { host: '192.168.56.32', port: 26379 },
    { host: '192.168.56.33', port: 26379 }
  ],
  // TLS for connecting to Redis servers (optional)
  tls: {
    cert: 'containers/redis/client.crt',
    key: 'containers/redis/client.key',
    ca: ['containers/redis/ca.crt'],
    rejectUnauthorized: false
  },
  // TLS for connecting to Redis sentinels (optional)
  sentinelTLS: {
    cert: 'containers/redis/client.crt',
    key: 'containers/redis/client.key',
    ca: ['containers/redis/ca.crt'],
    rejectUnauthorized: false
  }
}`
    settings.set('SENTINEL_CONFIG', config)
    const connector = RedisSentinel({ settingsRepository: settings })
    const result = await connector()
    assert.propertyVal(result, 'name', 'mymaster')
    assert.sameDeepMembers(result.sentinels, [
      { host: '192.168.56.31', port: 26379 },
      { host: '192.168.56.32', port: 26379 },
      { host: '192.168.56.33', port: 26379 }
    ])
    assert.include(result.tls.cert, '-----BEGIN CERTIFICATE-----')
    assert.include(result.tls.key, '-----BEGIN PRIVATE KEY-----')
    assert.isFalse(result.tls.rejectUnauthorized)
    assert.include(result.sentinelTLS.cert, '-----BEGIN CERTIFICATE-----')
    assert.include(result.sentinelTLS.key, '-----BEGIN PRIVATE KEY-----')
    assert.isFalse(result.sentinelTLS.rejectUnauthorized)
    assert.isTrue(result.enableTLSForSentinelMode)
  })

  it('should return settings read from object', async function () {
    const settings = new Map()
    const config = {
      name: 'mymaster',
      // password for connecting to Sentinel (optional)
      sentinelPassword: 'keyboard cat',
      sentinels: [
        { host: '192.168.56.31', port: 26379 },
        { host: '192.168.56.32', port: 26379 },
        { host: '192.168.56.33', port: 26379 }
      ],
      // TLS for connecting to Redis servers (optional)
      tls: {
        cert: 'containers/redis/client.crt',
        key: 'containers/redis/client.key',
        ca: ['containers/redis/ca.crt'],
        rejectUnauthorized: false
      },
      // TLS for connecting to Redis sentinels (optional)
      sentinelTLS: {
        cert: 'containers/redis/client.crt',
        key: 'containers/redis/client.key',
        ca: ['containers/redis/ca.crt'],
        rejectUnauthorized: false
      }
    }
    settings.set('SENTINEL_CONFIG', config)
    const connector = RedisSentinel({ settingsRepository: settings })
    const result = await connector()
    assert.propertyVal(result, 'name', 'mymaster')
    assert.sameDeepMembers(result.sentinels, [
      { host: '192.168.56.31', port: 26379 },
      { host: '192.168.56.32', port: 26379 },
      { host: '192.168.56.33', port: 26379 }
    ])
    assert.include(result.tls.cert, '-----BEGIN CERTIFICATE-----')
    assert.include(result.tls.key, '-----BEGIN PRIVATE KEY-----')
    assert.isFalse(result.tls.rejectUnauthorized)
    assert.include(result.sentinelTLS.cert, '-----BEGIN CERTIFICATE-----')
    assert.include(result.sentinelTLS.key, '-----BEGIN PRIVATE KEY-----')
    assert.isFalse(result.sentinelTLS.rejectUnauthorized)
    assert.isTrue(result.enableTLSForSentinelMode)
  })
})
