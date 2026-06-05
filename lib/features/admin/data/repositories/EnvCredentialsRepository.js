//
// Copyright 2022 Perforce Software
//
import * as assert from 'node:assert'
import crypto from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { CredentialsRepository } from 'helix-auth-svc/lib/features/admin/domain/repositories/CredentialsRepository.js'

// Compare two strings in constant time to avoid leaking how many characters
// matched via timing differences. Both values are hashed to a fixed-length
// digest first so that crypto.timingSafeEqual() never sees differing lengths
// (which would otherwise throw and reveal the length of the expected value).
function constantTimeEqual(a, b) {
  const aDigest = crypto.createHash('sha256').update(String(a)).digest()
  const bDigest = crypto.createHash('sha256').update(String(b)).digest()
  return crypto.timingSafeEqual(aDigest, bDigest)
}

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
    // compare both values before combining so the result does not short-circuit
    // and reveal, via timing, whether only the username matched
    const usernameMatch = constantTimeEqual(username, this._adminUsername)
    const passwordMatch = constantTimeEqual(password, adminPasswd)
    return usernameMatch && passwordMatch
  }
}

export { EnvCredentialsRepository }
