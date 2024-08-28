//
// Copyright 2024 Perforce Software
//
import * as assert from 'node:assert'

/**
 * Process the given RSA key data such that it can be ingested by the SAML
 * client library. In particular, remove any data that precedes the data
 * encapsulation boundary, as described in RFC 7468.
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
      // There are attributes before the first encapsulation boundary, must
      // filter out the lines that are not the encapsulated data and armor.
      const lines = input.split(/\r?\n/)
      const beginIdx = lines.findIndex((l) => l.startsWith('-----BEGIN'))
      const endIdx = lines.findIndex((l) => l.startsWith('-----END'))
      if (beginIdx > 0 && endIdx > beginIdx) {
        return lines.slice(beginIdx, endIdx + 1).join('\n')
      }
    }
    return input
  }
}
