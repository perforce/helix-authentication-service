//
// Copyright 2024 Perforce Software
//
import * as assert from 'node:assert'

//
// Retrieve the user entity for the given user identifier.
//
export default ({ getDomainLeader, entityRepository, entityRepositoryLock }) => {
  assert.ok(getDomainLeader, 'getDomainLeader must be defined')
  assert.ok(entityRepository, 'user repository must be defined')
  assert.ok(entityRepositoryLock, 'repository lock must be defined')
  return async (userId, domain) => {
    assert.ok(userId, 'get user by id: user identifier must be defined')
    await entityRepositoryLock.acquireReadLock()
    try {
      const server = getDomainLeader(domain)
      return entityRepository.getUser(userId, server, domain)
    } finally {
      await entityRepositoryLock.releaseReadLock()
    }
  }
}
