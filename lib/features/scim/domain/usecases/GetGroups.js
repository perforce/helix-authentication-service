//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'

//
// Retrieve user entities matching the given criteria.
//
export default ({ getDomainLeader, entityRepository }) => {
  assert.ok(getDomainLeader, 'getDomainLeader must be defined')
  assert.ok(entityRepository, 'user repository must be defined')
  return async (query, domain) => {
    assert.ok(query, 'get groups: query must be defined')
    const server = getDomainLeader(domain)
    let results = await entityRepository.getGroups(query, server)
    results = query.filterResults(results)
    results = query.sortResults(results)
    return results
  }
}
