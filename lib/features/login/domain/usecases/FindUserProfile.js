//
// Copyright 2020-2022 Perforce Software
//
import * as assert from 'node:assert'
import { RequestError } from 'helix-auth-svc/lib/common/domain/errors/RequestError.js'

/**
 * Find the user entity for the given request identifier, taking the user
 * entity from the user repository (to prevent replay attacks).
 *
 * If there is no request for the given identifier, returns null. If unable to
 * acquire a user entity before the timeout, rejects with an error.
 *
 * The optional timeout and interval control how long to wait, and how
 * frequently to check, for the user entity to be received.
 *
 * @param {String} requestId - request identifier for which to find user entity.
 * @param {int} timeout - optional timeout in milliseconds (default 10,000).
 * @param {int} internal - optional interval in milliseconds (default 1,000).
 * @return {User} user entity, or null if no matching request.
 * @throws {Error} if timeout is reached before user entity can be found.
 */
export default ({ requestRepository, userRepository }) => {
  assert.ok(requestRepository, 'request repository must be defined')
  assert.ok(userRepository, 'user repository must be defined')
  return (requestId, timeout, interval) => {
    assert.ok(requestId, 'find user: request identifier must be defined')
    const requestTimeout = timeout || 10000
    const intervalTimeout = interval || 1000
    // verify this request exists in order to fail fast if the client made a
    // mistake for whatever reason
    return requestRepository.get(requestId).then((request) => {
      if (request) {
        return userRepository.take(request.id).then((user) => {
          return new Promise((resolve, reject) => {
            if (user) {
              resolve(user)
            } else {
              // wait for the data to become available
              const timer = setInterval(() => {
                userRepository.take(request.id).then((user) => {
                  if (user) {
                    clearInterval(timer)
                    resolve(user)
                  }
                })
              }, intervalTimeout)
              // but do not wait indefinitely
              setTimeout(() => {
                clearInterval(timer)
                reject(new RequestError('timeout waiting for user data', 408))
              }, requestTimeout)
            }
          })
        })
      } else {
        return Promise.resolve(null)
      }
    })
  }
}
