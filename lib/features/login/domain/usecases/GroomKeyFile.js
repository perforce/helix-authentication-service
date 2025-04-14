//
// Copyright 2025 Perforce Software
//
import * as assert from 'node:assert'

/**
 * Process the given RSA key data such that it can be ingested by the SAML
 * client library. In particular, remove any lines outside of the data
 * encapsulation boundaries, as described in RFC 7468.
 *
 * See https://github.com/node-saml/node-saml/issues/361 for more details.
 *
 * @param {String} input - raw input as read from the key file.
 * @return {String} result of grooming.
 */
export default () => {
  return (input) => {
    assert.ok(input, 'groom-key-file: input must be defined')
    if (!input.trim().startsWith('-----BEGIN')) {
      // There may be attributes outside of the BEGIN/END encapsulation
      // boundary, and those must be filtered out for node-saml.
      const incoming = input.split(/\r?\n/)
      const result = []
      let inside = false
      for (const line of incoming) {
        if (line.startsWith('-----BEGIN')) {
          inside = true
        }
        if (inside) {
          result.push(line)
        }
        if (line.startsWith('-----END')) {
          inside = false
        }
      }
      return result.join('\n')
    }
    return input.trim()
  }
}
