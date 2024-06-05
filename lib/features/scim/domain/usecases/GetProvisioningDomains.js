//
// Copyright 2024 Perforce Software
//
import * as assert from 'node:assert'
import * as fs from 'node:fs/promises'

//
// Retrieve the list of configured user provisioning domains.
//
export default ({ settingsRepository }) => {
  assert.ok(settingsRepository, 'settingsRepository must be defined')
  return async () => {
    const bearerToken = await getBearerToken(settingsRepository)
    const provisioning = settingsRepository.get('PROVISIONING')
    // Prefer the PROVISIONING setting over classic BEARER_TOKEN as that has a
    // default value that will always be defined.
    if (provisioning) {
      if (provisioning.providers === undefined) {
        throw new Error('missing providers list in provisioning')
      }
      if (!Array.isArray(provisioning.providers)) {
        throw new Error('provisioning providers must be a list')
      }
      const domains = new Set()
      const tokens = new Set()
      for (const provider of provisioning.providers) {
        // read file-based tokens
        if (provider.bearerTokenFile) {
          provider.bearerToken = await fs.readFile(provider.bearerTokenFile, 'utf-8')
          delete provider.bearerTokenFile
        }
        if (provider.bearerToken === undefined) {
          throw new Error(`provider ${provider} missing bearer token`)
        }
        if (provider.domain === undefined) {
          throw new Error(`provider ${provider} missing domain`)
        }
        if (provider.domain.match(/^\w+$/) === null) {
          throw new Error(`provider ${provider.domain} must be alphanumeric`)
        }
        if (domains.has(provider.domain)) {
          throw new Error(`domain ${provider.domain} already exists`)
        }
        domains.add(provider.domain)
        if (tokens.has(provider.bearerToken)) {
          throw new Error('multiple providers using the same token')
        }
        tokens.add(provider.bearerToken)
      }
      return provisioning.providers
    } else if (bearerToken) {
      return [{ bearerToken }]
    }
    return []
  }
}

async function getBearerToken(settings) {
  if (settings.has('BEARER_TOKEN_FILE')) {
    const filename = settings.get('BEARER_TOKEN_FILE')
    return (await fs.readFile(filename, 'utf-8')).trim()
  }
  return settings.get('BEARER_TOKEN')
}
