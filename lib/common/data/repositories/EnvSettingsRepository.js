//
// Copyright 2021 Perforce Software
//
const assert = require('assert')
/* global include */
const SettingsRepository = include('lib/common/domain/repositories/SettingsRepository')

//
// Implementation of the settings repository backed by process.env.
//
module.exports = class EnvSettingsRepository extends SettingsRepository {
  get (name) {
    assert.ok(name, 'env get: name must be defined')
    return process.env[name]
  }
}
