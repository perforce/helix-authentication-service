//
// Copyright 2022 Perforce Software
//
import * as assert from 'node:assert'
import * as fs from 'node:fs'
import dotenv from 'dotenv'
import { SettingsRepository } from 'helix-auth-svc/lib/common/domain/repositories/SettingsRepository.js'

//
// Implementation of the settings repository backed by process.env.
//
class DefaultsEnvRepository extends SettingsRepository {
  constructor() {
    super()
    const data = fs.readFileSync('defaults.env', 'utf8')
    const config = dotenv.parse(data)
    this._props = new Map(Object.entries(config))
  }

  // Return a Map-based iterator of all name/value pairs.
  entries() {
    return this._props.entries()
  }

  get(name) {
    assert.ok(name, 'defaults get: name must be defined')
    return this._props.get(name)
  }

  getBool(name) {
    assert.ok(name, 'defaults getBool: name must be defined')
    return (/true/i).test(this._props.get(name))
  }

  getInt(name, fallback) {
    assert.ok(name, 'defaults getInt: name must be defined')
    return parseInt(this._props.get(name), 10) || fallback
  }

  has(name) {
    assert.ok(name, 'defaults has: name must be defined')
    return this._props.has(name)
  }

  set() {
    throw new Error('not implemented')
  }
}

export { DefaultsEnvRepository }
