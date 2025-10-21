//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'

/**
 * Generate a set of URLs for the Content-Security-Policy form-action field.
 *
 * The returned list wil always include 'self' as required, along with base URL
 * of all of the configured identity providers.
 *
 * @return {Promise} resolves to a list of URLs for the form-action property.
 * @throws {Error} if URL generation fails for any reason.
 */
export default ({ getAuthProviders, getSamlConfiguration }) => {
  assert.ok(getAuthProviders, 'getAuthProviders must be defined')
  assert.ok(getSamlConfiguration, 'getSamlConfiguration must be defined')
  return async () => {
    const providers = await getAuthProviders()
    const urls = ["'self'"]
    if (providers) {
      for (let provider of providers) {
        if (provider.protocol === 'saml') {
          const configured = await getSamlConfiguration(provider.id)
          const url = new URL(configured.entryPoint)
          urls.push(url.origin)
        } else if (provider.protocol === 'oidc') {
          const url = new URL(provider.issuerUri)
          urls.push(url.origin)
        }
      }
    }
    return urls
  }
}
