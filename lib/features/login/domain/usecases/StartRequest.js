//
// Copyright 2020-2022 Perforce Software
//
import assert from 'node:assert'
import crypto from 'node:crypto'
import { Request } from 'helix-auth-svc/lib/features/login/domain/entities/Request.js'

/**
 * Begin a login request for the user with the associated identifier.
 *
 * @param {String} userId - user identifier provided by the client.
 * @param {boolean} forceAuthn - if true, force the user to authenticate, if possible.
 * @returns {Request} the new Request entity.
 */
export default ({ requestRepository }) => {
  assert.ok(requestRepository, 'start request: repository must be defined')
  return (userId, forceAuthn) => {
    assert.ok(userId, 'start request: user identifier must be defined')
    const bytes = crypto.randomBytes(16)
    const requestId = bytes.toString('base64url')
    const request = new Request(requestId, userId, forceAuthn)
    requestRepository.add(requestId, request)
    return request
  }
}
