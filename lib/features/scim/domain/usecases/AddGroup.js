//
// Copyright 2021 Perforce Software
//
const assert = require('assert')

//
// Add a new group entity to the entity repository.
//
module.exports = ({ entityRepository }) => {
  assert.ok(entityRepository, 'entity repository must be defined')
  return async (group) => {
    assert.ok(group, 'add group: group record must be defined')
    assert.ok(group.members, 'add group: group must have members property')
    group.members.forEach((e) => {
      assert.ok(e.value, 'group member must have `value` property')
    })
    const existing = await entityRepository.getGroup(group.displayName)
    if (existing) {
      throw new Error('group already exists')
    }
    return entityRepository.addGroup(group)
  }
}
