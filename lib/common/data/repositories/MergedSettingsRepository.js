//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'
import { SettingsRepository } from 'helix-auth-svc/lib/common/domain/repositories/SettingsRepository.js'

//
// Settings repository whose settings are backed by the temporary, process.env,
// and defaults repositories. All writes are stored in the temporary repository,
// while reads go to the temporary first, then process.env, and finally the
// defaults repository. As long as a setting exists, even if the value is the
// undefined value, it will shadow settings in lower priority repositories.
//
class MergedSettingsRepository extends SettingsRepository {
  constructor({ temporaryRepository, processEnvRepository, defaultsRepository }) {
    super()
    assert.ok(temporaryRepository, 'combo: temporaryRepository must be defined')
    assert.ok(processEnvRepository, 'combo: processEnvRepository must be defined')
    assert.ok(defaultsRepository, 'combo: defaultsRepository must be defined')
    this._temporary = temporaryRepository
    this._process = processEnvRepository
    this._defaults = defaultsRepository
  }

  get(name) {
    assert.ok(name, 'combo get: name must be defined')
    if (this._temporary.has(name)) {
      return this._temporary.get(name)
    }
    if (this._process.has(name)) {
      return this._process.get(name)
    }
    return this._defaults.get(name)
  }

  getBool(name) {
    assert.ok(name, 'combo getBool: name must be defined')
    if (this._temporary.has(name)) {
      return this._temporary.getBool(name)
    }
    if (this._process.has(name)) {
      return this._process.getBool(name)
    }
    return this._defaults.getBool(name)
  }

  getInt(name, fallback) {
    assert.ok(name, 'combo getInt: name must be defined')
    return parseInt(this.get(name), 10) || fallback
  }

  has(name) {
    assert.ok(name, 'combo has: name must be defined')
    return this._temporary.has(name) || this._process.has(name) || this._defaults.has(name)
  }

  set(name, value) {
    assert.ok(name, 'combo set: name must be defined')
    assert.ok(value, 'combo set: value must be defined')
    this._temporary.set(name, value)
  }
}

export { MergedSettingsRepository }
