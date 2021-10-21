//
// Copyright 2021 Perforce Software
//
import * as assert from 'node:assert'

//
// Remove a group entity from the entity repository.
//
export default ({ entityRepository }) => {
  assert.ok(entityRepository, 'entity repository must be defined')
  return async (displayName) => {
    assert.ok(displayName, 'remove user: displayName must be defined')
    return entityRepository.removeGroup(displayName)
  }
}
