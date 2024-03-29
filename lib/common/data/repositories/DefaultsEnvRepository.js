//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'
import * as fs from 'node:fs'
import dotenv from 'dotenv'
import { SettingsRepository } from 'helix-auth-svc/lib/common/domain/repositories/SettingsRepository.js'

// Only consider file-based settings that might be embedded withing a
// configuration file that supports collections.
const filebasedSettings = {
  'IDP_CONFIG': 'IDP_CONFIG_FILE',
}

//
// Implementation of the settings repository backed by a file named defaults.env
// that is assumed to be present in the service installation.
//
class DefaultsEnvRepository extends SettingsRepository {
  constructor() {
    super()
    const data = fs.readFileSync('defaults.env', 'utf8')
    const config = dotenv.parse(data)
    this._props = loadFiles(new Map(Object.entries(config)))
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
    throw new Error('read-only repository')
  }
}

function loadFiles(settings) {
  for (const [valuekey, filekey] of Object.entries(filebasedSettings)) {
    const filename = settings.get(filekey)
    if (filename) {
      const content = fs.readFileSync(filename, 'utf8')
      settings.set(valuekey, content.trim())
      settings.delete(filekey)
    }
  }
  return settings
}

export { DefaultsEnvRepository }
