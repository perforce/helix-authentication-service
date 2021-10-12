//
// Copyright 2020-2021 Perforce Software
//
const assert = require('assert')

/**
 * Find an existing request for the given request identifier.
 *
 * @param {String} requestId - request identifier to query.
 * @returns {Request} the new Request entity, or null if not found.
 */
module.exports = ({ requestRepository }) => {
  assert.ok(requestRepository, 'request repository must be defined')
  return (requestId) => {
    assert.ok(requestId, 'find request: request identifier must be defined')
    return requestRepository.get(requestId)
  }
}
