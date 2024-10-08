//
// Copyright 2024 Perforce Software
//
import * as assert from 'node:assert'

//
// Remove a user entity from the entity repository.
//
export default ({ getDomainLeader, getDomainMembers, entityRepository }) => {
  assert.ok(getDomainLeader, 'getDomainLeader must be defined')
  assert.ok(getDomainMembers, 'getDomainMembers must be defined')
  assert.ok(entityRepository, 'user repository must be defined')
  return async (userId, domain) => {
    assert.ok(userId, 'remove user: userId must be defined')
    const leader = getDomainLeader(domain)
    await entityRepository.removeUser(userId, leader)
    const members = getDomainMembers(domain)
    for (const member of members) {
      await entityRepository.removeUser(userId, member)
    }
  }
}
