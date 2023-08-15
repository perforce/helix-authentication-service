//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'
import * as fs from 'node:fs/promises'
import { oidcNameMapping, samlNameMapping } from 'helix-auth-svc/lib/constants.js'

/**
 * Read the configuration for the identity providers.
 *
 * @return {Promise} resolves to array of identity providers.
 * @throws {Error} if deserialization fails for any reason.
 */
export default ({ defaultsRepository, settingsRepository, tidyAuthProviders }) => {
  assert.ok(defaultsRepository, 'defaultsRepository must be defined')
  assert.ok(settingsRepository, 'settingsRepository must be defined')
  assert.ok(tidyAuthProviders, 'tidyAuthProviders must be defined')
  return async (options = { loadFiles: true }) => {
    // load any explicitly configured identity providers
    const providers = await loadAuthProviders(settingsRepository)
    injectDefaults(defaultsRepository, providers)
    // convert classic OIDC and SAML settings to providers
    await convertToProviders(settingsRepository, providers)
    decodeSpecialValues(providers)
    // optionally load file-based values into the providers array
    if (options.loadFiles) {
      await loadFileValues(providers)
    }
    return tidyAuthProviders(providers)
  }
}

// Parse the AUTH_PROVIDERS and prepare for use. Return empty array if no
// explicit providers have been configured.
async function loadAuthProviders(settingsRepository) {
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
      return parsed.providers
    }
  }
  return []
}

function injectDefaults(defaults, providers) {
  providers.forEach((p) => {
    const mapping = p.protocol === 'oidc' ? oidcNameMapping : samlNameMapping
    for (const [env, prov] of Object.entries(mapping)) {
      if (defaults.has(env) && p[prov] === undefined) {
        p[prov] = defaults.get(env)
      }
    }
  })
}

// certain properties were encoded before saving so now they must be decode so
// they are ready to be used by other use cases
function decodeSpecialValues(providers) {
  for (const provider of providers) {
    if (typeof provider.metadata === 'string') {
      const decoded = Buffer.from(provider.metadata, 'base64').toString('utf-8')
      provider.metadata = decoded
    }
  }
}

async function loadFileValues(providers) {
  for (const provider of providers) {
    await maybeReadFile(provider, 'clientSecretFile', 'clientSecret')
    await maybeReadFile(provider, 'idpCertFile', 'idpCert')
    await maybeReadFile(provider, 'metadataFile', 'metadata')
  }
}

async function convertToProviders(settingsRepository, providers) {
  const defproto = settingsRepository.get('DEFAULT_PROTOCOL')
  const oidc = convert(settingsRepository, oidcNameMapping)
  if (oidc !== null) {
    oidc['protocol'] = 'oidc'
    if (oidc.issuerUri) {
      // assign a static identifier for converted provider that has sufficient
      // configuration for general use
      oidc['id'] = 'oidc'
    }
    if (defproto === 'oidc') {
      oidc['default'] = true
    }
    providers.push(oidc)
  }
  const saml = convert(settingsRepository, samlNameMapping)
  if (saml !== null) {
    saml['protocol'] = 'saml'
    if (saml.metadataUrl || saml.metadataFile || saml.signonUrl) {
      // assign a static identifier for converted provider that has sufficient
      // configuration for general use
      saml['id'] = 'saml'
    }
    if (defproto === 'saml') {
      saml['default'] = true
    }
    providers.push(saml)
  }
}

function convert(settingsRepository, mapping) {
  const provider = {}
  let initialLength = Object.keys(provider).length
  for (const [env, prov] of Object.entries(mapping)) {
    // n.b. there is no need to consider the settings that were renamed as the
    // lib/env.js module converts them at startup
    if (settingsRepository.has(env)) {
      provider[prov] = settingsRepository.get(env)
    }
  }
  const finalLength = Object.keys(provider).length
  return finalLength > initialLength ? provider : null
}

async function maybeReadFile(provider, fileKey, valueKey) {
  if (fileKey in provider) {
    const filename = provider[fileKey]
    if (filename) {
      const contents = await fs.readFile(filename, 'utf8')
      provider[valueKey] = contents.trim()
      delete provider[fileKey]
    }
  }
}
