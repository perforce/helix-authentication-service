//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'
import JSON5 from 'json5'

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
        // The configuration is a JavaScript object literal, historically
        // wrapped in a CommonJS (module.exports = ...) or ES module (export
        // default ...) assignment. Parse it as data with JSON5 rather than
        // evaluating it as code; evaluation allows arbitrary code execution
        // for anyone who can edit this admin-editable setting (HAS-678). JSON5
        // accepts the same relaxed syntax (comments, single quotes, unquoted
        // keys, trailing commas) used by existing configuration files, so this
        // remains backward compatible with the legacy module format.
        const unwrapped = contents
          .replace(/module\.exports\s*=/, '')
          .replace(/export\s+default/, '')
          .replace(/;\s*$/, '')
        return JSON5.parse(unwrapped)
      }
      // if not a string, then it has already been parsed
      return contents
    }
    return {}
  }
}
