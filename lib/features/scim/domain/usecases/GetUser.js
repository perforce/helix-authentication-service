//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'

//
// Retrieve the user entity for the given user identifier.
//
export default ({ getDomainLeader, entityRepository }) => {
  assert.ok(getDomainLeader, 'getDomainLeader must be defined')
  assert.ok(entityRepository, 'user repository must be defined')
  return (userId, domain) => {
    assert.ok(userId, 'get user by id: user identifier must be defined')
    const server = getDomainLeader(domain)
    return entityRepository.getUser(userId, server)
  }
}
