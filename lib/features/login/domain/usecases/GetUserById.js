//
// Copyright 2020-2021 Perforce Software
//
import * as assert from 'node:assert'

/**
 * Retrieve the user entity for the given user identifier, taking the user
 * entity from the user repository (to prevent replay attacks).
 *
 * If there is no user for the given identifier, returns null.
 *
 * @param {String} userId - user identifier by which to find user entity.
 * @return {User} user entity, or null if no matching user.
 */
export default ({ userRepository }) => {
  assert.ok(userRepository, 'user repository must be defined')
  return (userId) => {
    assert.ok(userId, 'get user by id: user identifier must be defined')
    return userRepository.take(userId)
  }
}
