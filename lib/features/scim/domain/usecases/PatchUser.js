//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'
import { patchBodyValidation, scimPatch } from 'scim-patch'
import { User } from 'helix-auth-svc/lib/features/scim/domain/entities/User.js'
import { MutabilityError } from 'helix-auth-svc/lib/features/scim/domain/errors/MutabilityError.js'
import { NoSuchUserError } from 'helix-auth-svc/lib/features/scim/domain/errors/NoSuchUserError.js'

//
// Apply a patch operation to a user entity with the given identifier.
//
// The patch operation must have the shape defined in section 3.5.2 of RFC 7644,
// including the "schemas" and "Operations" properties.
//
export default ({ getDomainLeader, getDomainMembers, entityRepository, settingsRepository }) => {
  assert.ok(getDomainLeader, 'getDomainLeader must be defined')
  assert.ok(getDomainMembers, 'getDomainMembers must be defined')
  assert.ok(entityRepository, 'user repository must be defined')
  assert.ok(settingsRepository, 'settingsRepository must be defined')
  return async (userId, patch, domain) => {
    assert.ok(userId, 'patch user: user identifier must be defined')
    assert.ok(patch, 'patch user: patch must be defined')
    patchBodyValidation(patch)
    const leader = getDomainLeader(domain)
    const user = await entityRepository.getUser(userId, leader, domain)
    if (user) {
      // Create a deep-clone of the user object since scimPatch() modifies the
      // object in-place, and returns it as well, which is quite unhelpful.
      const rawPatch = scimPatch(user.clone(), patch.Operations)
      const patched = User.fromPatch(rawPatch)
      if (!user.equals(patched)) {
        const members = getDomainMembers(domain)
        if (user.username !== patched.username) {
          const allowRename = settingsRepository.getBool('ALLOW_USER_RENAME')
          if (!allowRename) {
            throw new MutabilityError('user rename prohibited', 'userName')
          }
          await entityRepository.renameUser(user.username, patched.username, leader)
          for (const member of members) {
            if (member.p4port != leader.p4port) {
              await entityRepository.renameUser(user.username, patched.username, member)
            }
          }
        }
        const updated = entityRepository.updateUser(patched, leader, domain)
        for (const member of members) {
          if (member.p4port != leader.p4port) {
            await entityRepository.updateUser(patched, member, domain)
          }
        }
        return updated
      }
      return user
    }
    throw new NoSuchUserError(userId)
  }
}
