//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'
import { parseConfigText } from 'helix-auth-svc/lib/common/parseConfigText.js'

/**
 * Read the configuration for which the service acts as identity provider.
 *
 * @return {Promise} resolves to object with IdP configuration.
 * @throws {Error} if validation fails for any reason.
 */
export default ({ settingsRepository }) => {
  assert.ok(settingsRepository, 'settingsRepository must be defined')
  return async () => {
    const contents = settingsRepository.get('IDP_CONFIG')
    if (contents) {
      if (typeof contents === 'string') {
        // parse as data, never evaluate as code (HAS-678)
        return parseConfigText(contents)
      }
      // if not a string, then it has already been parsed
      return contents
    }
    return {}
  }
}
