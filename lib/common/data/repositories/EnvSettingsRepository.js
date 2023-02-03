//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'
import { SettingsRepository } from 'helix-auth-svc/lib/common/domain/repositories/SettingsRepository.js'

//
// Implementation of the settings repository backed by process.env.
//
class EnvSettingsRepository extends SettingsRepository {
  get (name) {
    assert.ok(name, 'env get: name must be defined')
    return process.env[name]
  }

  getBool (name) {
    assert.ok(name, 'env getBool: name must be defined')
    return (/true/i).test(process.env[name])
  }

  getInt(name, fallback) {
    assert.ok(name, 'env getInt: name must be defined')
    return parseInt(this.get(name), 10) || fallback
  }

  has (name) {
    assert.ok(name, 'env has: name must be defined')
    return name in process.env
  }

  set (name, value) {
    assert.ok(name, 'env set: name must be defined')
    assert.ok(value, 'env set: value must be defined')
    process.env[name] = value
  }
}

export { EnvSettingsRepository }
