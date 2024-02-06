//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'

//
// Add a new group entity to the entity repository.
//
export default ({ getDomainLeader, getDomainMembers, entityRepository }) => {
  assert.ok(getDomainLeader, 'getDomainLeader must be defined')
  assert.ok(getDomainMembers, 'getDomainMembers must be defined')
  assert.ok(entityRepository, 'entityRepository must be defined')
  return async (group, domain) => {
    assert.ok(group, 'add group: group record must be defined')
    assert.ok(group.members, 'add group: group must have members property')
    group.members.forEach((e) => {
      assert.ok(e.value, 'group member must have `value` property')
    })
    const leader = getDomainLeader(domain)
    const existing = await entityRepository.getGroup(group.displayName, leader, domain)
    if (existing) {
      throw new Error('group already exists')
    }
    const addedGroup = await entityRepository.addGroup(group, leader, domain)
    const members = getDomainMembers(domain)
    for (const member of members) {
      await entityRepository.addGroup(group, member, domain)
    }
    return addedGroup
  }
}
