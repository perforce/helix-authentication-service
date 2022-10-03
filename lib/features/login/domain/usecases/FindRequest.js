//
// Copyright 2020-2022 Perforce Software
//
import * as assert from 'node:assert'

/**
 * Find an existing request for the given request identifier.
 *
 * @param {String} requestId - request identifier to query.
 * @returns {Request} the new Request entity, or null if not found.
 */
export default ({ requestRepository }) => {
  assert.ok(requestRepository, 'request repository must be defined')
  return (requestId) => {
    if (requestId) {
      return requestRepository.get(requestId)
    }
    return null
  }
}
