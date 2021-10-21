//
// Copyright 2021 Perforce Software
//
import * as assert from 'node:assert'

//
// Remove a user entity from the entity repository.
//
export default ({ entityRepository }) => {
  assert.ok(entityRepository, 'user repository must be defined')
  return async (userId) => {
    assert.ok(userId, 'remove user: userId must be defined')
    return entityRepository.removeUser(userId)
  }
}
