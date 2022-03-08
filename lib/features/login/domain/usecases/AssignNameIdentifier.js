//
// Copyright 2022 Perforce Software
//
import * as assert from 'node:assert'
import { ulid } from 'ulid'

/**
 * If the `nameID` property is missing, attempt to set it to a reasonable value.
 * If `nameIDFormat` property is missing, set it to the "unspecified" value.
 *
 * @param {Object} user - user object to be copied from.
 * @returns {Object} modified copy of the input.
 */
export default ({ settingsRepository }) => {
  assert.ok(settingsRepository, 'settings repository must be defined')
  return (user) => {
    assert.ok(user, 'assign nameid: user must be defined')
    const clone = Object.assign({}, user)
    if (!clone.nameID) {
      let nameID = null
      const nameIdField = settingsRepository.get('SAML_NAMEID_FIELD')
      // Different identity providers have different fields that make good
      // candidates for the fake name identifier. Start with whatever the
      // administrator specified, it anything.
      if (nameIdField && clone[nameIdField]) {
        nameID = clone[nameIdField]
      } else if (clone.email) {
        nameID = clone.email
      } else if (clone.sub) {
        nameID = clone.sub
      } else {
        // need to use some unique value if nothing else
        nameID = ulid()
      }
      clone.nameID = nameID
    }
    // Same with nameIDFormat, the SAML library requires that it have a value,
    // so default to something sensible if not set.
    if (!clone.nameIDFormat) {
      clone.nameIDFormat = 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified'
    }
    return clone
  }
}
