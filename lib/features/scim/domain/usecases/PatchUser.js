//
// Copyright 2021 Perforce Software
//
import * as assert from 'node:assert'
import { patchBodyValidation, scimPatch } from 'scim-patch'
import { User } from 'helix-auth-svc/lib/features/scim/domain/entities/User.js'
import { NoSuchUserError } from 'helix-auth-svc/lib/features/scim/domain/errors/NoSuchUserError.js'

//
// Apply a patch operation to a user entity with the given identifier.
//
// The patch operation must have the shape defined in section 3.5.2 of RFC 7644,
// including the "schemas" and "Operations" properties.
//
export default ({ entityRepository }) => {
  assert.ok(entityRepository, 'user repository must be defined')
  return async (userId, patch) => {
    assert.ok(userId, 'patch user: user identifier must be defined')
    assert.ok(patch, 'patch user: patch must be defined')
    patchBodyValidation(patch)
    const user = await entityRepository.getUser(userId)
    if (user) {
      // Create a deep-clone of the user object since scimPatch() modifies the
      // object in-place, and returns it as well, which is quite unhelpful.
      const rawPatch = scimPatch(user.clone(), patch.Operations)
      const patched = User.fromPatch(rawPatch)
      if (!user.equals(patched)) {
        if (user.username !== patched.username) {
          await entityRepository.renameUser(user.username, patched.username)
        }
        return entityRepository.updateUser(patched)
      }
      return user
    }
    throw new NoSuchUserError(userId)
  }
}
