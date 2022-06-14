//
// Copyright 2021 Perforce Software
//
import * as assert from 'node:assert'
import { SettingsRepository } from 'helix-auth-svc/lib/common/domain/repositories/SettingsRepository.js'

//
// Implementation of the settings repository backed by a Map.
//
class MapSettingsRepository extends SettingsRepository {
  constructor (map) {
    super()
    assert.ok(map, 'settings: map must be defined')
    this._props = map
  }

  get (name) {
    assert.ok(name, 'map get: name must be defined')
    return this._props.get(name)
  }

  getBool (name) {
    assert.ok(name, 'map getBool: name must be defined')
    return (/true/i).test(this._props.get(name))
  }
}

export { MapSettingsRepository }
