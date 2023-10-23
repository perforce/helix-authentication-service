//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'
import { SettingsRepository } from 'helix-auth-svc/lib/common/domain/repositories/SettingsRepository.js'
import { renamedSettings } from 'helix-auth-svc/lib/constants.js'

//
// Implementation of the settings repository that uses values read from the
// configuration file, falling back to the process environment otherwise. The
// configuration file will either by named .env or config.toml which is read by
// the data source registered in the container.
//
class EnvSettingsRepository extends SettingsRepository {
  constructor({ configurationRepository }) {
    assert.ok(configurationRepository, 'env: configurationRepository is required')
    super()
    this._backingStore = configurationRepository
    this.reload()
  }

  // Return a Map-based iterator of all name/value pairs.
  entries() {
    return this._props.entries()
  }

  get(name) {
    assert.ok(name, 'env get: name must be defined')
    if (this._props.has(name)) {
      return this._props.get(name)
    }
    // fallback to reading directly from process environment to support a
    // container-based deployment that does not use a .env file
    return process.env[name]
  }

  getBool(name) {
    assert.ok(name, 'env getBool: name must be defined')
    return (/true/i).test(this.get(name))
  }

  getInt(name, fallback) {
    assert.ok(name, 'env getInt: name must be defined')
    return parseInt(this.get(name), 10) || fallback
  }

  has(name) {
    assert.ok(name, 'env has: name must be defined')
    return this._props.has(name) || name in process.env
  }

  set(name, value) {
    assert.ok(name, 'env set: name must be defined')
    this._props.set(name, value)
  }

  reload() {
    try {
      this._props = this._backingStore.readSync()
      for (const [oldname, newname] of Object.entries(renamedSettings)) {
        const oldvalue = this.get(oldname)
        if (this.get(newname) === undefined && oldvalue !== undefined) {
          this.set(newname, oldvalue)
        }
      }
    } catch (err) {
      this._props = new Map()
    }
  }
}

export { EnvSettingsRepository }
