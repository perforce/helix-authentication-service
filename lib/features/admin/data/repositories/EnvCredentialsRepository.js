//
// Copyright 2022 Perforce Software
//
import * as assert from 'node:assert'
import { readFile } from 'node:fs/promises'
import { CredentialsRepository } from 'helix-auth-svc/lib/features/admin/domain/repositories/CredentialsRepository.js'

//
// Validates admin credentials based on environment settings.
//
class EnvCredentialsRepository extends CredentialsRepository {
  constructor({ settingsRepository }) {
    super()
    assert.ok(settingsRepository, 'settingsRepository is required')
    this._adminUsername = settingsRepository.get('ADMIN_USERNAME')
    this._adminPassfile = settingsRepository.get('ADMIN_PASSWD_FILE')
  }

  async verify(username, password) {
    assert.ok(username, 'ecreds: username must be defined')
    assert.ok(password, 'ecreds: password must be defined')
    // Assume the file exists and is readable, there is no other practical
    // course of action for this repository implementation.
    const contents = await readFile(this._adminPassfile, 'utf-8')
    const adminPasswd = contents.trim()
    return username === this._adminUsername && password === adminPasswd
  }
}

export { EnvCredentialsRepository }
