//
// Copyright 2021 Perforce Software
//
import * as assert from 'node:assert'

//
// Retrieve user entities matching the given criteria.
//
export default ({ entityRepository }) => {
  assert.ok(entityRepository, 'user repository must be defined')
  return async (query) => {
    assert.ok(query, 'get groups: query must be defined')
    let results = await entityRepository.getGroups(query)
    results = query.filterResults(results)
    results = query.sortResults(results)
    return results
  }
}
