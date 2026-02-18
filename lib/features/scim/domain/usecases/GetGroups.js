//
// Copyright 2024 Perforce Software
//
import * as assert from 'node:assert'

//
// Retrieve user entities matching the given criteria.
//
export default ({ getDomainLeader, entityRepository, entityRepositoryLock }) => {
  assert.ok(getDomainLeader, 'getDomainLeader must be defined')
  assert.ok(entityRepository, 'user repository must be defined')
  assert.ok(entityRepositoryLock, 'repository lock must be defined')
  return async (query, domain) => {
    assert.ok(query, 'get groups: query must be defined')
    await entityRepositoryLock.acquireReadLock()
    try {
      const server = getDomainLeader(domain)
      let results = await entityRepository.getGroups(query, server, domain)
      results = query.filterResults(results)
      results = query.sortResults(results)
      return results
    } finally {
      await entityRepositoryLock.releaseReadLock()
    }
  }
}
