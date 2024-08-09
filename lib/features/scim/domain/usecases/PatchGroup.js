//
// Copyright 2024 Perforce Software
//
import * as assert from 'node:assert'
import { patchBodyValidation, scimPatch } from 'scim-patch'
import { MutabilityError } from 'helix-auth-svc/lib/features/scim/domain/errors/MutabilityError.js'
import { NoSuchGroupError } from 'helix-auth-svc/lib/features/scim/domain/errors/NoSuchGroupError.js'

//
// Apply a patch operation to a group entity with the given name.
//
// The patch operation must have the shape defined in section 3.5.2 of RFC 7644,
// including the "schemas" and "Operations" properties.
//
export default ({ getDomainLeader, getDomainMembers, entityRepository }) => {
  assert.ok(getDomainLeader, 'getDomainLeader must be defined')
  assert.ok(getDomainMembers, 'getDomainMembers must be defined')
  assert.ok(entityRepository, 'entity repository must be defined')
  return async (groupId, patch, domain) => {
    assert.ok(groupId, 'patch group: group identifier must be defined')
    assert.ok(patch, 'patch group: patch must be defined')
    patchBodyValidation(patch)
    const leader = getDomainLeader(domain)
    const group = await entityRepository.getGroup(groupId, leader, domain)
    if (group) {
      // Create a deep-clone of the group object since scimPatch() modifies the
      // object in-place, and returns it as well, which is quite unhelpful.
      const patched = scimPatch(group.clone(), patch.Operations)
      // scim-patch will completely remove the `members` property if it was
      // empty and the operation was a remove.
      if ('members' in patched === false) {
        patched.members = []
      }
      // remove duplicate members resulting from patches applied repeatedly
      const allValues = new Set()
      const uniqueMembers = patched.members.reduce((acc, elem) => {
        if (!allValues.has(elem.value)) {
          allValues.add(elem.value)
          acc.push(elem)
        }
        return acc
      }, [])
      patched.members = uniqueMembers
      // now check if the original and patch are actually different
      if (!group.equals(patched)) {
        if (group.displayName !== patched.displayName) {
          throw new MutabilityError('cannot rename group', 'displayName')
        }
        const updated = await entityRepository.updateGroup(patched, leader, domain)
        const members = getDomainMembers(domain)
        for (const member of members) {
          if (member.p4port != leader.p4port) {
            await entityRepository.updateGroup(patched, member, domain)
          }
        }
        return updated
      }
      return group
    } else {
      throw new NoSuchGroupError(groupId)
    }
  }
}
