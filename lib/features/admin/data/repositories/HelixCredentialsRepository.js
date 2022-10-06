//
// Copyright 2022 Perforce Software
//
import * as assert from 'node:assert'
import { CredentialsRepository } from 'helix-auth-svc/lib/features/admin/domain/repositories/CredentialsRepository.js'
import p4pkg from 'p4api'
const { P4 } = p4pkg

//
// Validates admin credentials based on environment settings.
//
class HelixCredentialsRepository extends CredentialsRepository {
  constructor({ settingsRepository }) {
    super()
    this.p4port = settingsRepository.get('P4PORT')
  }

  async verify(username, password) {
    assert.ok(username, 'pcreds: username must be defined')
    assert.ok(password, 'pcreds: password must be defined')
    const p4 = new P4({ P4PORT: this.p4port, P4USER: username })
    const loginOut = await p4.cmd('login', password)
    if (findData(loginOut, `User ${username} doesn't exist`)) {
      // no hints on username or password mismatch
      return false
    }
    if (loginOut.error) {
      // some other error occurred
      throw new Error(loginOut.error[0].data)
    }
    const protectsOut = await p4.cmd('protects -m', password)
    if (findData(protectsOut, 'Protections table is empty')) {
      // no protections at all, basically everyone is super
      return true
    }
    if (protectsOut.error) {
      throw new Error(protectsOut.error[0].data)
    }
    if (protectsOut.stat[0].permMax === 'super') {
      return true
    }
    return false
  }
}

// Search all the things to find a string of output that contains query.
function findData(command, query) {
  if (command.prompt && typeof command.prompt === 'string') {
    if (command.prompt.includes(query)) {
      return true
    }
  }
  if (command.info && Array.isArray(command.info)) {
    for (const entry of command.info) {
      if (typeof entry.data === 'string' && entry.data.includes(query)) {
        return true
      }
    }
  }
  if (command.error && Array.isArray(command.error)) {
    for (const entry of command.error) {
      if (typeof entry.data === 'string' && entry.data.includes(query)) {
        return true
      }
    }
  }
  return false
}

export { HelixCredentialsRepository }
