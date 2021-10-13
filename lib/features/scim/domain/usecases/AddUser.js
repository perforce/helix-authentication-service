//
// Copyright 2021 Perforce Software
//
const assert = require('assert')

//
// Add a new user entity to the entity repository.
//
module.exports = ({ entityRepository }) => {
  assert.ok(entityRepository, 'user repository must be defined')
  return async (user) => {
    assert.ok(user, 'add user: user record must be defined')
    assert.ok(user.username, 'add user: user must have username property')
    const existing = await entityRepository.getUser(user.username)
    if (existing) {
      throw new Error('user already exists')
    }
    return entityRepository.addUser(user)
  }
}
