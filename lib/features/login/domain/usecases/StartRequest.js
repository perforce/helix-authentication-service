//
// Copyright 2020 Perforce Software
//
const assert = require('assert')
const { ulid } = require('ulid')
const Request = require('@login/domain/entities/Request')

/**
 * Begin a login request for the user with the associated identifier.
 *
 * @param {String} userId - user identifier for retrieving the profile later.
 * @param {boolean} forceAuthn - if true, force the user to authenticate, if possible.
 * @returns {Request} the new Request entity.
 */
module.exports = ({ requestRepository }) => {
  assert.ok(requestRepository, 'request repository must be defined')
  return (userId, forceAuthn) => {
    assert.ok(userId, 'user identifier must be defined')
    const requestId = ulid()
    const request = new Request(requestId, userId, forceAuthn)
    requestRepository.add(requestId, request)
    return request
  }
}
