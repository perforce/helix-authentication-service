//
// Copyright 2020-2021 Perforce Software
//
const assert = require('assert')
/* global include */
const User = include('lib/domain/entities/User')

/**
 * Store the user profile and associate it with the given identifier.
 *
 * @param {String} userId - user identifier for retrieving the profile later.
 * @param {Object} profile - user profile data of no particular shape.
 * @returns {User} the new User entity.
 */
module.exports = ({ userRepository }) => {
  assert.ok(userRepository, 'user repository must be defined')
  return (userId, profile) => {
    assert.ok(userId, 'receive user profile: user identifier must be defined')
    assert.ok(profile, 'receive user profile: user profile must be defined')
    const user = new User(userId, profile)
    userRepository.add(userId, user)
    return user
  }
}
