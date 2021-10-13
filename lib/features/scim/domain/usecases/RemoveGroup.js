//
// Copyright 2021 Perforce Software
//
const assert = require('assert')

//
// Remove a group entity from the entity repository.
//
module.exports = ({ entityRepository }) => {
  assert.ok(entityRepository, 'entity repository must be defined')
  return async (displayName) => {
    assert.ok(displayName, 'remove user: displayName must be defined')
    return entityRepository.removeGroup(displayName)
  }
}
