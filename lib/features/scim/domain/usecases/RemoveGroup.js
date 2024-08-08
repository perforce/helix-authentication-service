//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'

//
// Remove a group entity from the entity repository.
//
export default ({ getDomainLeader, getDomainMembers, entityRepository }) => {
  assert.ok(getDomainLeader, 'getDomainLeader must be defined')
  assert.ok(getDomainMembers, 'getDomainMembers must be defined')
  assert.ok(entityRepository, 'entity repository must be defined')
  return async (displayName, domain) => {
    assert.ok(displayName, 'remove user: displayName must be defined')
    const leader = getDomainLeader(domain)
    await entityRepository.removeGroup(displayName, leader)
    const members = getDomainMembers(domain)
    for (const member of members) {
      if ( member.p4port != leader.p4port) {
        await entityRepository.removeGroup(displayName, member)
      }
    }
  }
}
