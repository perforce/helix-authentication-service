//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'
import * as fs from 'node:fs'
import dotenv from 'dotenv'
import { SettingsRepository } from 'helix-auth-svc/lib/common/domain/repositories/SettingsRepository.js'

// Rename settings from old names to new names so that the code only has to look
// for the new name and not the old one. This is only needed for the old dotenv
// based configuration.
const renamedSettings = {
  'SAML_SP_ISSUER': 'SAML_SP_ENTITY_ID',
  'SAML_IDP_ISSUER': 'SAML_IDP_ENTITY_ID',
  'SP_CERT_FILE': 'CERT_FILE',
  'SP_KEY_FILE': 'KEY_FILE',
}

//
// Implementation of the settings repository that reads from the .env
// configuration file, falling back to the process environment otherwise.
//
class EnvSettingsRepository extends SettingsRepository {
  constructor({ dotenvFile }) {
    super()
    this._dotenvFile = dotenvFile
    this.reload()
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
      const data = fs.readFileSync(this._dotenvFile, 'utf8')
      const config = dotenv.parse(data)
      this._props = new Map(Object.entries(config))
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
