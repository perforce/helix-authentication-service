//
// Copyright 2021 Perforce Software
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
}

export { EnvSettingsRepository }
