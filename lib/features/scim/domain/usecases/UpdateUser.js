//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'
import { NoSuchUserError } from 'helix-auth-svc/lib/features/scim/domain/errors/NoSuchUserError.js'

//
// Update an existing user entity in the entity repository.
//
export default ({ getDomainLeader, getDomainMembers, entityRepository }) => {
  assert.ok(getDomainLeader, 'getDomainLeader must be defined')
  assert.ok(getDomainMembers, 'getDomainMembers must be defined')
  assert.ok(entityRepository, 'user repository must be defined')
  return async (username, user, domain) => {
    assert.ok(username, 'update user: username must be defined')
    assert.ok(user, 'update user: user record must be defined')
    assert.ok(user.username, 'update user: user must have username property')
    const leader = getDomainLeader(domain)
    const members = getDomainMembers(domain)
    const existing = await entityRepository.getUser(username, leader)
    if (existing) {
      if (username !== user.username) {
        // The given `username` might be identical, in which case the repository
        // will detect this and ignore the rename attempt.
        await entityRepository.renameUser(username, user.username, leader)
        for (const member of members) {
          await entityRepository.renameUser(username, user.username, member)
        }
      }
      const updated = await entityRepository.updateUser(user, leader)
      for (const member of members) {
        await entityRepository.updateUser(user, member)
      }
      return updated
    }
    throw new NoSuchUserError(username)
  }
}
