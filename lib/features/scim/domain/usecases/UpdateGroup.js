//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'
import { MutabilityError } from 'helix-auth-svc/lib/features/scim/domain/errors/MutabilityError.js'
import { NoSuchGroupError } from 'helix-auth-svc/lib/features/scim/domain/errors/NoSuchGroupError.js'

//
// Update an existing group entity in the entity repository.
//
export default ({ getDomainLeader, getDomainMembers, entityRepository }) => {
  assert.ok(getDomainLeader, 'getDomainLeader must be defined')
  assert.ok(getDomainMembers, 'getDomainMembers must be defined')
  assert.ok(entityRepository, 'entity repository must be defined')
  return async (groupId, group, domain) => {
    assert.ok(groupId, 'update group: group identifier must be defined')
    assert.ok(group, 'update group: group record must be defined')
    assert.ok(group.displayName, 'update group: group must have display name')
    const leader = getDomainLeader(domain)
    const existing = await entityRepository.getGroup(groupId, leader)
    if (existing) {
      if (existing.displayName !== group.displayName) {
        throw new MutabilityError('cannot rename group', 'displayName')
      }
      const updated = await entityRepository.updateGroup(group, leader)
      const members = getDomainMembers(domain)
      for (const member of members) {
        await entityRepository.updateGroup(group, member)
      }
      return updated
    }
    throw new NoSuchGroupError(groupId)
  }
}
