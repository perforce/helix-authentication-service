//
// Copyright 2024 Perforce Software
//
import * as assert from 'node:assert'

//
// Retrieve the group entity for the given display name.
//
export default ({ getDomainLeader, entityRepository, entityRepositoryLock }) => {
  assert.ok(getDomainLeader, 'getDomainLeader must be defined')
  assert.ok(entityRepository, 'entity repository must be defined')
  assert.ok(entityRepositoryLock, 'repository lock must be defined')
  return async (displayName, domain) => {
    assert.ok(displayName, 'get group: display name must be defined')
    const server = getDomainLeader(domain)
    await entityRepositoryLock.acquireReadLock()
    try {
      return entityRepository.getGroup(displayName, server, domain)
    } finally {
      await entityRepositoryLock.releaseReadLock()
    }
  }
}
