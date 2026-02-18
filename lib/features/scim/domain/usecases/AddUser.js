//
// Copyright 2024 Perforce Software
//
import * as assert from 'node:assert'

//
// Add a new user entity to the entity repository.
//
export default ({ getDomainLeader, getDomainMembers, entityRepository, entityRepositoryLock }) => {
  assert.ok(getDomainLeader, 'getDomainLeader must be defined')
  assert.ok(getDomainMembers, 'getDomainMembers must be defined')
  assert.ok(entityRepository, 'user repository must be defined')
  assert.ok(entityRepositoryLock, 'repository lock must be defined')
  return async (user, domain) => {
    assert.ok(user, 'add user: user record must be defined')
    assert.ok(user.username, 'add user: user must have username property')
    await entityRepositoryLock.acquireWriteLock()
    try {
      const leader = getDomainLeader(domain)
      const existing = await entityRepository.getUser(user.username, leader)
      if (existing) {
        throw new Error('user already exists')
      }
      const addedUser = await entityRepository.addUser(user, leader, domain)
      const members = getDomainMembers(domain)
      for (const member of members) {
        await entityRepository.addUser(user, member, domain)
      }
      return addedUser
    } finally {
      await entityRepositoryLock.releaseWriteLock()
    }
  }
}
