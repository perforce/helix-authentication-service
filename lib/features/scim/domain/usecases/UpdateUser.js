//
// Copyright 2024 Perforce Software
//
import * as assert from 'node:assert'
import { MutabilityError } from 'helix-auth-svc/lib/features/scim/domain/errors/MutabilityError.js'
import { NoSuchUserError } from 'helix-auth-svc/lib/features/scim/domain/errors/NoSuchUserError.js'

//
// Update an existing user entity in the entity repository.
//
export default ({ getDomainLeader, getDomainMembers, entityRepository, settingsRepository }) => {
  assert.ok(getDomainLeader, 'getDomainLeader must be defined')
  assert.ok(getDomainMembers, 'getDomainMembers must be defined')
  assert.ok(entityRepository, 'entityRepository must be defined')
  assert.ok(settingsRepository, 'settingsRepository must be defined')
  return async (userId, user, domain) => {
    assert.ok(userId, 'update user: identifier must be defined')
    assert.ok(user, 'update user: user record must be defined')
    assert.ok(user.username, 'update user: user must have username property')
    const leader = getDomainLeader(domain)
    const members = getDomainMembers(domain)
    const existing = await entityRepository.getUser(userId, leader, domain)
    if (existing) {
      if (existing.username !== user.username) {
        const allowRename = settingsRepository.getBool('ALLOW_USER_RENAME')
        if (!allowRename) {
          throw new MutabilityError('user rename prohibited', 'userName')
        }
        await entityRepository.renameUser(existing.username, user.username, leader)
        for (const member of members) {
          await entityRepository.renameUser(existing.username, user.username, member)
        }
      }
      const updated = await entityRepository.updateUser(user, leader, domain)
      for (const member of members) {
        await entityRepository.updateUser(user, member, domain)
      }
      return updated
    }
    throw new NoSuchUserError(userId)
  }
}
