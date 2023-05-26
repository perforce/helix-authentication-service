//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'

/**
 * Add a new authentication provider, or update an existing entry. The given
 * provider object will be modified in place such that it will have an 'id'
 * property assigned with a unique identifier.
 *
 * @param {Object} provider - auth provider with optional 'id' field.
 * @returns {Array} - all auth providers with identifiers assigned.
 * @throws {Error} if given provider is invalid.
 */
export default ({ getAuthProviders, validateAuthProvider, tidyAuthProviders }) => {
  assert.ok(getAuthProviders, 'getAuthProviders must be defined')
  assert.ok(validateAuthProvider, 'validateAuthProvider must be defined')
  assert.ok(tidyAuthProviders, 'tidyAuthProviders must be defined')
  return async (provider) => {
    assert.ok(provider, 'provider must be defined')
    const errorMsg = validateAuthProvider(provider)
    if (errorMsg) {
      throw new assert.AssertionError({ message: errorMsg })
    }
    let providers = await getAuthProviders()
    if (provider.id) {
      providers = providers.filter((e) => e.id !== provider.id)
    }
    providers.push(provider)
    tidyAuthProviders(providers)
    return providers
  }
}
