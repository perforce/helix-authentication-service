//
// Copyright 2020 Perforce Software
//
const assert = require('assert')

/**
 * Retrieve the user entity for the given user identifier, taking the user
 * entity from the user repository (to prevent replay attacks).
 *
 * If there is no user for the given identifier, returns null.
 *
 * @param {String} userId - user identifier by which to find user entity.
 * @return {User} user entity, or null if no matching user.
 */
module.exports = ({ userRepository }) => {
  assert.ok(userRepository, 'user repository must be defined')
  return (userId) => {
    assert.ok(userId, 'user identifier must be defined')
    return userRepository.take(userId)
  }
}
