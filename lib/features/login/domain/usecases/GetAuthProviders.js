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
    const providers = settingsRepository.get('AUTH_PROVIDERS') || []
    injectDefaults(defaultsRepository, providers)
    // convert classic OIDC and SAML settings to providers
    await convertToProviders(settingsRepository, providers)
    // optionally load file-based values into the providers array
    if (options.loadFiles) {
      await loadFileValues(providers)
    }
    return tidyAuthProviders(providers)
  }
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
  const initialLength = Object.keys(provider).length
  for (const [env, prov] of Object.entries(mapping)) {
    if (settingsRepository.has(env)) {
      provider[prov] = settingsRepository.get(env)
    }
  }
  const finalLength = Object.keys(provider).length
  return finalLength > initialLength ? provider : null
}

async function maybeReadFile(provider, fileKey, valueKey) {
  if (fileKey in provider && provider[valueKey] === undefined) {
    const filename = provider[fileKey]
    if (filename) {
      const contents = await fs.readFile(filename, 'utf8')
      provider[valueKey] = contents.trim()
      delete provider[fileKey]
    }
  }
}
