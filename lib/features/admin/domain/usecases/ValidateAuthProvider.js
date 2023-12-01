//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'
import * as fs from 'node:fs'

/**
 * Validate the given authentication provider as well as remove properties whose
 * values are blank, null, or undefined.
 *
 * @param {String} provider - object to be validated as a provider.
 * @return {String} error message or null.
 * @throws {Error} if validation fails for any reason.
 */
export default () => {
  return (provider) => {
    assert.ok(provider, 'provider must be defined')
    // The id property is optional when creating a new provider but it also
    // cannot be a non-sensical value as that is a sign of other trouble.
    if (provider.id === 'undefined' || provider.id === 'null') {
      return 'must provide a valid identifier'
    }
    // remove all undefined, null, or empty string values
    for (const [key, value] of Object.entries(provider)) {
      if (value === undefined || value === null || value === '') {
        delete provider[key]
      }
    }
    if (!Object.hasOwn(provider, 'protocol')) {
      return 'missing protocol property'
    }
    if (provider.protocol === 'oidc') {
      if (Object.hasOwn(provider, 'issuerUri')) {
        if (!validateUrl(provider.issuerUri)) {
          return `invalid issuerUri: ${provider.issuerUri}`
        }
      } else {
        return 'missing issuerUri property'
      }
      if (!Object.hasOwn(provider, 'clientId')) {
        return 'missing clientId property'
      }
      if (Object.hasOwn(provider, 'clientSecretFile')) {
        if (!fs.existsSync(provider.clientSecretFile)) {
          return `missing file: ${provider.clientSecretFile}`
        }
      } else if (!Object.hasOwn(provider, 'clientSecret')) {
        // must have both clientCert/File and clientKey/File if not secret
        const hasFiles = Object.hasOwn(provider, 'clientCertFile') && Object.hasOwn(provider, 'clientKeyFile')
        const hasValues = Object.hasOwn(provider, 'clientCert') && Object.hasOwn(provider, 'clientKey')
        if (hasFiles) {
          if (!fs.existsSync(provider.clientCertFile)) {
            return `missing file: ${provider.clientCertFile}`
          }
          if (!fs.existsSync(provider.clientKeyFile)) {
            return `missing file: ${provider.clientKeyFile}`
          }
        } else if (!hasValues) {
          return 'must have one of: clientSecret, clientSecretFile'
        }
      }
      if (Object.hasOwn(provider, 'maxAge')) {
        if (isNaN(parseInt(provider.maxAge, 10))) {
          return `invalid maxAge: ${provider.maxAge}`
        }
      }
    } else if (provider.protocol === 'saml') {
      if (Object.hasOwn(provider, 'metadataUrl')) {
        if (!validateUrl(provider.metadataUrl)) {
          return `invalid metadataUrl: ${provider.metadataUrl}`
        }
      } else if (Object.hasOwn(provider, 'metadataFile')) {
        if (!fs.existsSync(provider.metadataFile)) {
          return `missing file: ${provider.metadataFile}`
        }
      } else if (Object.hasOwn(provider, 'signonUrl')) {
        if (!validateUrl(provider.signonUrl)) {
          return `invalid signonUrl: ${provider.signonUrl}`
        }
      } else if (!Object.hasOwn(provider, 'metadata')) {
        return 'must have one of: metadata, metadataUrl, metadataFile, signonUrl'
      }
    } else {
      return `unsupported protocol: ${provider.protocol}`
    }
    return null
  }
}

function validateUrl(url) {
  return url.startsWith('https://') || url.startsWith('http://')
}
