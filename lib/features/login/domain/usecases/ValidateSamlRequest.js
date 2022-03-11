//
// Copyright 2022 Perforce Software
//
import * as assert from 'node:assert'

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
    if (audience in idpConfig) {
      if ('acsUrl' in idpConfig[audience]) {
        const url = idpConfig[audience].acsUrl
        if (url) {
          return recipient === url
        }
      } else if ('acsUrls' in idpConfig[audience]) {
        return idpConfig[audience].acsUrls.includes(recipient)
      } else if ('acsUrlRe' in idpConfig[audience]) {
        const urlre = idpConfig[audience].acsUrlRe
        if (urlre) {
          return recipient.match(urlre) !== null
        }
      }
    }
    return false
  }
}
