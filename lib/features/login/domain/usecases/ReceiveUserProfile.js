//
// Copyright 2020-2022 Perforce Software
//
import * as assert from 'node:assert'
import { User } from 'helix-auth-svc/lib/features/login/domain/entities/User.js'

/**
 * Store the user profile and associate it with the given identifier.
 *
 * @param {String} requestId - request identifier for retrieving the profile later.
 * @param {String} userId - user identifier for retrieving the profile later.
 * @param {Object} profile - user profile data of no particular shape.
 * @returns {User} the new User entity.
 */
export default ({ userRepository }) => {
  assert.ok(userRepository, 'user repository must be defined')
  return (requestId, userId, profile) => {
    assert.ok(requestId, 'receive user profile: request identifier must be defined')
    assert.ok(userId, 'receive user profile: user identifier must be defined')
    assert.ok(profile, 'receive user profile: user profile must be defined')
    const user = new User(userId, profile)
    userRepository.add(requestId, user)
    return user
  }
}
