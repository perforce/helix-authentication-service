//
// Copyright 2021 Perforce Software
//
import * as assert from 'node:assert'
import { SettingsRepository } from 'helix-auth-svc/lib/common/domain/repositories/SettingsRepository.js'

//
// Implementation of the settings repository backed by a Map.
//
class MapSettingsRepository extends SettingsRepository {
  constructor () {
    super()
    this._props = new Map()
  }

  // Return a Map-based iterator of all name/value pairs.
  entries() {
    return this._props.entries()
  }

  get (name) {
    assert.ok(name, 'map get: name must be defined')
    return this._props.get(name)
  }

  getBool (name) {
    assert.ok(name, 'map getBool: name must be defined')
    return (/true/i).test(this._props.get(name))
  }

  getInt (name, fallback) {
    assert.ok(name, 'map getInt: name must be defined')
    return parseInt(this._props.get(name), 10) || fallback
  }

  has (name) {
    assert.ok(name, 'map has: name must be defined')
    return this._props.has(name)
  }

  set (name, value) {
    assert.ok(name, 'map set: name must be defined')
    this._props.set(name, value)
  }

  delete (name) {
    assert.ok(name, 'map set: name must be defined')
    this._props.delete(name)
  }

  // Removes all elements from the underlying map.
  clear () {
    this._props.clear()
  }
}

export { MapSettingsRepository }
