//
// Copyright 2021 Perforce Software
//
import * as assert from 'node:assert'

//
// Retrieve the user entity for the given user identifier.
//
export default ({ entityRepository }) => {
  assert.ok(entityRepository, 'user repository must be defined')
  return (userId) => {
    assert.ok(userId, 'get user by id: user identifier must be defined')
    return entityRepository.getUser(userId)
  }
}
