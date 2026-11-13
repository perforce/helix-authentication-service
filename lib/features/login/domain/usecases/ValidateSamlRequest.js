//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'
import { minimatch } from 'minimatch'

/**
 * Validate the SAML authn request recipient matches the configuration.
 *
 * @param {String} audience - entity identifier of the service provider.
 * @param {String} recipient - ACS URL of the service provider.
 * @return {Boolean} true if request matches configuration, false otherwise.
 * @throws {Error} if validation fails for any reason.
 */
export default ({ getIdPConfiguration }) => {
  assert.ok(getIdPConfiguration, 'getIdPConfiguration must be defined')
  return async (audience, recipient) => {
    assert.ok(audience, 'validate-saml: audience must be defined')
    assert.ok(recipient, 'validate-saml: recipient must be defined')
    const idpConfig = await getIdPConfiguration()
    const matchingKey = findMatchingEntry(audience, idpConfig)
    if (matchingKey) {
      if ('acsUrl' in idpConfig[matchingKey]) {
        const url = idpConfig[matchingKey].acsUrl
        if (url) {
          return recipient === url
        }
      } else if ('acsUrls' in idpConfig[matchingKey]) {
        return idpConfig[matchingKey].acsUrls.includes(recipient)
      } else if ('acsUrlRe' in idpConfig[matchingKey]) {
        const urlre = idpConfig[matchingKey].acsUrlRe
        if (urlre) {
          // The pattern must match the entire URL, otherwise a substring
          // match would accept an attacker-controlled URL that merely
          // contains the expected value (HAS-733).
          return new RegExp(`^(?:${urlre})$`).test(recipient)
        }
      }
    }
    return false
  }
}

// find the entry in the IdP configuration that matches the audience, accounting
// for those values that make use of a glob pattern
export function findMatchingEntry(audience, idpConfig) {
  for (const entry in idpConfig) {
    if ((entry.includes('*') || entry.includes('?')) && minimatch(audience, entry)) {
      return entry
    } else if (entry === audience) {
      return audience
    }
  }
  return null
}
