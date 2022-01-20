//
// Copyright 2021 Perforce Software
//
import * as assert from 'node:assert'
import { KeyValueConnector } from 'helix-auth-svc/lib/features/login/domain/connectors/KeyValueConnector.js'

//
// Map-backed dummy implementation of the Redis connector.
//
class DummyRedisConnector extends KeyValueConnector {
  constructor () {
    super()
    this._store = new Map()
  }

  client () {
    return this._store
  }

  set (key, value) {
    assert.ok(key, 'redcon-set: key must be defined')
    assert.ok(value, 'redcon-set: value must be defined')
    this._store.set(key, value)
  }

  get (key) {
    assert.ok(key, 'redcon-get: key must be defined')
    return this._store.get(key)
  }

  take (key) {
    assert.ok(key, 'redcon-take: key must be defined')
    const value = this._store.get(key)
    this._store.delete(key)
    return value
  }
}

export { DummyRedisConnector }
