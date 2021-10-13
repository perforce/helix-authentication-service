//
// Copyright 2021 Perforce Software
//
const assert = require('assert')
/* global include */
const MutabilityError = include('lib/features/scim/domain/errors/MutabilityError')
const NoSuchGroupError = include('lib/features/scim/domain/errors/NoSuchGroupError')

//
// Update an existing group entity in the entity repository.
//
module.exports = ({ entityRepository }) => {
  assert.ok(entityRepository, 'entity repository must be defined')
  return async (groupId, group) => {
    assert.ok(groupId, 'update group: group identifier must be defined')
    assert.ok(group, 'update group: group record must be defined')
    assert.ok(group.displayName, 'update group: group must have display name')
    const existing = await entityRepository.getGroup(groupId)
    if (existing) {
      if (existing.displayName !== group.displayName) {
        throw new MutabilityError('cannot rename group', 'displayName')
      }
      return entityRepository.updateGroup(group)
    }
    throw new NoSuchGroupError(groupId)
  }
}
