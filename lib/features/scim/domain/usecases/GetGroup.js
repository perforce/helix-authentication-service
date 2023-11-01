//
// Copyright 2021 Perforce Software
//
import * as assert from 'node:assert'

//
// Retrieve the group entity for the given display name.
//
export default ({ getDomainLeader, entityRepository }) => {
  assert.ok(getDomainLeader, 'getDomainLeader must be defined')
  assert.ok(entityRepository, 'entity repository must be defined')
  return (displayName, domain) => {
    assert.ok(displayName, 'get group: display name must be defined')
    const server = getDomainLeader(domain)
    return entityRepository.getGroup(displayName, server)
  }
}
