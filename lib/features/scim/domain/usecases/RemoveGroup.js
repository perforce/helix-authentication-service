//
// Copyright 2024 Perforce Software
//
import * as assert from 'node:assert'

//
// Remove a group entity from the entity repository.
//
export default ({ getDomainLeader, getDomainMembers, entityRepository, entityRepositoryLock }) => {
  assert.ok(getDomainLeader, 'getDomainLeader must be defined')
  assert.ok(getDomainMembers, 'getDomainMembers must be defined')
  assert.ok(entityRepository, 'entity repository must be defined')
  assert.ok(entityRepositoryLock, 'repository lock must be defined')
  return async (displayName, domain) => {
    assert.ok(displayName, 'remove user: displayName must be defined')
    await entityRepositoryLock.acquireWriteLock()
    try {
      const leader = getDomainLeader(domain)
      await entityRepository.removeGroup(displayName, leader)
      const members = getDomainMembers(domain)
      for (const member of members) {
        await entityRepository.removeGroup(displayName, member)
      }
    } finally {
      await entityRepositoryLock.releaseWriteLock()
    }
  }
}
