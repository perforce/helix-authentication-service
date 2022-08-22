//
// Copyright 2022 Perforce Software
//
import * as assert from 'node:assert'
import * as fs from 'node:fs'
import { CredentialsRepository } from 'helix-auth-svc/lib/features/admin/domain/repositories/CredentialsRepository.js'

//
// Validates admin credentials based on environment settings.
//
class EnvCredentialsRepository extends CredentialsRepository {
  constructor({ adminUsername, adminPassfile }) {
    super()
    this._adminUsername = adminUsername
    this._adminPassfile = adminPassfile
  }

  verify (username, password) {
    assert.ok(username, 'ecreds: username must be defined')
    assert.ok(password, 'ecreds: password must be defined')
    // Assume the file exists and is readable, there is no other practical
    // course of action for this repository implementation.
    const adminPasswd = fs.readFileSync(this._adminPassfile, 'utf-8').trim()
    return username === this._adminUsername && password === adminPasswd
  }
}

export { EnvCredentialsRepository }
