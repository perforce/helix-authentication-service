//
// Copyright 2022 Perforce Software
//
import * as assert from 'node:assert'
import * as fs from 'node:fs/promises'

/**
 * Read the configuration for the identity providers.
 *
 * @return {Promise} resolves to array of identity providers if using multiple,
 *                   otherwise null if using single provider.
 * @throws {Error} if deserialization fails for any reason.
 */
export default ({ settingsRepository }) => {
  assert.ok(settingsRepository, 'settingsRepository must be defined')
  return async () => {
    const providersFile = settingsRepository.get('AUTH_PROVIDERS_FILE')
    let content
    if (providersFile) {
      content = await fs.readFile(providersFile, 'utf8')
    } else {
      content = settingsRepository.get('AUTH_PROVIDERS')
    }
    if (content) {
      const parsed = JSON.parse(content)
      if (parsed.providers) {
        // ensure every provider has a protocol as it is easy to forget
        parsed.providers.forEach((e) => {
          if (!e.protocol) {
            // OIDC must always have an issuerUri whereas SAML does not
            if (e.issuerUri) {
              e.protocol = 'oidc'
            } else {
              e.protocol = 'saml'
            }
          }
        })
        // Assign unique identifiers to each provider, sorting them by label for
        // consistent numbering. While this only matters during the runtime of
        // the service, it is important that multiple service instances use the
        // same identifiers for the same set of providers.
        parsed.providers.sort((a, b) => {
          return a.label.localeCompare(b.label)
        })
        parsed.providers.forEach((e, i) => e.id = `${e.protocol}-${i}`)
        return parsed.providers
      }
    }
    return null
  }
}
