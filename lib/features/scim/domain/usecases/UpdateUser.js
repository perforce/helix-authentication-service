//
// Copyright 2021 Perforce Software
//
import * as assert from 'node:assert'
import { NoSuchUserError } from 'helix-auth-svc/lib/features/scim/domain/errors/NoSuchUserError.js'

//
// Update an existing user entity in the entity repository.
//
export default ({ entityRepository }) => {
  assert.ok(entityRepository, 'user repository must be defined')
  return async (username, user) => {
    assert.ok(username, 'update user: username must be defined')
    assert.ok(user, 'update user: user record must be defined')
    assert.ok(user.username, 'update user: user must have username property')
    const existing = await entityRepository.getUser(username)
    if (existing) {
      if (username !== user.username) {
        // The given `username` might be identical, in which case the repository
        // will detect this and ignore the rename attempt.
        await entityRepository.renameUser(username, user.username)
      }
      return entityRepository.updateUser(user)
    }
    throw new NoSuchUserError(username)
  }
}
