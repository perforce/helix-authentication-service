//
// Copyright 2020-2021 Perforce Software
//
const assert = require('assert')
const { ulid } = require('ulid')
/* global include */
const Request = include('lib/features/login/domain/entities/Request')

/**
 * Begin a login request for the user with the associated identifier.
 *
 * @param {String} userId - user identifier for retrieving the profile later.
 * @param {boolean} forceAuthn - if true, force the user to authenticate, if possible.
 * @param {String} requestId - desired request identifier, or null to have one made.
 * @returns {Request} the new Request entity.
 */
module.exports = ({ requestRepository }) => {
  assert.ok(requestRepository, 'request repository must be defined')
  return (userId, forceAuthn, requestId) => {
    assert.ok(userId, 'start request: user identifier must be defined')
    const actualRequestId = requestId || ulid()
    const request = new Request(actualRequestId, userId, forceAuthn)
    requestRepository.add(actualRequestId, request)
    return request
  }
}
