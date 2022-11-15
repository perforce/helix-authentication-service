//
// Copyright 2021 Perforce Software
//
import * as assert from 'node:assert'
import { SettingsRepository } from 'helix-auth-svc/lib/common/domain/repositories/SettingsRepository.js'

//
// Implementation of the settings repository backed by process.env.
//
class EnvSettingsRepository extends SettingsRepository {
  constructor ({ defaultsRepository }) {
    super()
    assert.ok(defaultsRepository, 'env: defaultsRepository must be defined')
    this._defaults = defaultsRepository
  }

  get (name) {
    assert.ok(name, 'env get: name must be defined')
    if (name in process.env) {
      return process.env[name]
    }
    return this._defaults.get(name)
  }

  getBool (name) {
    assert.ok(name, 'env getBool: name must be defined')
    if (name in process.env) {
      return (/true/i).test(process.env[name])
    }
    return this._defaults.getBool(name)
  }

  getInt(name, fallback) {
    assert.ok(name, 'env getInt: name must be defined')
    return parseInt(this.get(name), 10) || fallback
  }

  has (name) {
    assert.ok(name, 'env has: name must be defined')
    return name in process.env || this._defaults.has(name)
  }

  set (name, value) {
    assert.ok(name, 'env set: name must be defined')
    assert.ok(value, 'env set: value must be defined')
    process.env[name] = value
  }
}

export { EnvSettingsRepository }
