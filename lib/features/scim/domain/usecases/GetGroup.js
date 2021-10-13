//
// Copyright 2021 Perforce Software
//
const assert = require('assert')

//
// Retrieve the group entity for the given display name.
//
module.exports = ({ entityRepository }) => {
  assert.ok(entityRepository, 'entity repository must be defined')
  return (displayName) => {
    assert.ok(displayName, 'get group: display name must be defined')
    return entityRepository.getGroup(displayName)
  }
}
