//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'
import * as fs from 'node:fs'

/**
 * Validate the given authentication provider.
 *
 * @param {String} provider - object to be validated as a provider.
 * @return {String} error message or null.
 * @throws {Error} if validation fails for any reason.
 */
export default () => {
  return (provider) => {
    assert.ok(provider, 'provider must be defined')
    // The id property is optional when creating a new provider, while
    // everything else is expected to be present and have valid values.
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
        return 'must have one of: clientSecret, clientSecretFile'
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
