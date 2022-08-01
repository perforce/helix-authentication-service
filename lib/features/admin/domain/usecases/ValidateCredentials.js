//
// Copyright 2022 Perforce Software
//
import * as assert from 'node:assert'

/**
 * Validate the given admin credentials.
 *
 * @param {String} username - provided admin username.
 * @param {String} password - provided admin password.
 * @return {bool} true if okay, false otherwise.
 */
export default ({ credentialsRepository }) => {
  assert.ok(credentialsRepository, 'validate: creds repository must be defined')
  return (username, password) => {
    assert.ok(username, 'validate: username must be defined')
    assert.ok(password, 'validate: password must be defined')
    return credentialsRepository.verify(username, password)
  }
}
