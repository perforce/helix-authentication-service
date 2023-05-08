//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'

/**
 * Read the configuration for the identity providers and produce a login URL.
 *
 * @return {Promise} resolves to a single login URL value.
 * @throws {Error} if URL generation fails for any reason.
 */
export default ({ settingsRepository, getAuthProviders }) => {
  assert.ok(settingsRepository, 'settingsRepository must be defined')
  assert.ok(getAuthProviders, 'getAuthProviders must be defined')
  return async (serviceURI, requestId, instanceId, providerId) => {
    assert.ok(serviceURI !== undefined, 'serviceURI must be defined')
    assert.ok(requestId, 'requestId must be defined')
    assert.ok(instanceId, 'instanceId must be defined')
    const providers = await getAuthProviders()
    if (providers) {
      const provider = providerId ?
        findProvider(providers, providerId) :
        findPossibleDefault(providers)
      if (provider) {
        const pathname = `/${provider.protocol}/login/${requestId}`
        const search = `?instanceId=${instanceId}&providerId=${provider.id}`
        return `${serviceURI}${pathname}${search}`
      }
      const pathname = `/multi/login/${requestId}`
      const search = `?instanceId=${instanceId}`
      return `${serviceURI}${pathname}${search}`
    }
    // if all else fails, fallback to saml like always
    const pathname = `/saml/login/${requestId}`
    const search = `?instanceId=${instanceId}`
    return `${serviceURI}${pathname}${search}`
  }
}

function findProvider(providers, providerId) {
  return providers.find((e) => e.id === providerId)
}

function findPossibleDefault(providers) {
  // find a provider that is marked as the default
  const provider = providers.find((e) => 'default' in e)
  if (provider) {
    return provider
  }
  // otherwise look for candiates that are configured
  const candidates = providers.filter((e) => 'id' in e)
  if (candidates.length === 1) {
    return candidates[0]
  }
  return null
}
