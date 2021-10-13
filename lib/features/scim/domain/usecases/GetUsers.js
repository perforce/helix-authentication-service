//
// Copyright 2021 Perforce Software
//
const assert = require('assert')

//
// Retrieve user entities matching the given criteria.
//
module.exports = ({ entityRepository }) => {
  assert.ok(entityRepository, 'user repository must be defined')
  return async (query) => {
    assert.ok(query, 'get users: query must be defined')
    let results = await entityRepository.getUsers(query)
    results = query.filterResults(results)
    results = query.sortResults(results)
    return results
  }
}
