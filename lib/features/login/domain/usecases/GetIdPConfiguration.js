//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'

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
        // Normalize the input to help Node.js process the configuration. This
        // will take either CommonJS or ES6 and format it as a URI that can be
        // fed to Node.js via import using the special 'data' prefix.
        const filtered = contents.split(/\r?\n/).filter(line => !line.trim().startsWith('//'))
        const folded = filtered.map(line => line.trim()).join('')
        const exported = folded.replace('module.exports =', 'export default')
        const encoded = 'data:text/javascript,' + encodeURIComponent(exported)
        const module = await import(encoded)
        return module.default
      }
      // if not a string, then it has already been parsed
      return contents
    }
    return {}
  }
}
