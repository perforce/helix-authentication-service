//
// Copyright 2021 Perforce Software
//
import * as assert from 'node:assert'
import { MutabilityError } from 'helix-auth-svc/lib/features/scim/domain/errors/MutabilityError.js'
import { NoSuchGroupError } from 'helix-auth-svc/lib/features/scim/domain/errors/NoSuchGroupError.js'

//
// Update an existing group entity in the entity repository.
//
export default ({ entityRepository }) => {
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
