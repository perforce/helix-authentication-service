//
// Copyright 2021 Perforce Software
//
const assert = require('assert')
/* global include */
const SettingsRepository = include('lib/common/domain/repositories/SettingsRepository')

//
// Implementation of the settings repository backed by a Map.
//
module.exports = class MapSettingsRepository extends SettingsRepository {
  constructor (map) {
    super()
    assert.ok(map, 'settings: map must be defined')
    this._props = map
  }

  get (name) {
    assert.ok(name, 'map get: name must be defined')
    return this._props.get(name)
  }
}
