//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'

/**
 * Remove the given authentication provider from the list. Any files associated
 * with the provider entry will be deleted.
 *
 * @param {Object} provider - auth provider with optional 'id' field.
 * @returns {Array} - all remaining auth providers.
 * @throws {Error} if given provider is invalid.
 */
export default ({ getAuthProviders }) => {
  assert.ok(getAuthProviders, 'getAuthProviders must be defined')
  return async (provider) => {
    assert.ok(provider, 'provider must be defined')
    let providers = await getAuthProviders({ loadFiles: false })
    if (provider.id) {
      // filter the provider out of the list
      providers = providers.filter((e) => e.id !== provider.id)
    }
    return providers
  }
}
