//
// Copyright 2025 Perforce Software
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
  return async ({ loadFiles = true, hideSecrets = false } = {}) => {
    // load any explicitly configured identity providers
    const providers = settingsRepository.get('AUTH_PROVIDERS') || []
    // create clones of everything to avoid modifying data in-place, and
    // repeatedly creating duplicates when converting from classic settings
    const cloned = providers.map((p) => Object.assign({}, p))
    injectDefaults(defaultsRepository, cloned)
    // convert classic OIDC and SAML settings to providers
    await convertToProviders(settingsRepository, cloned)
    // decode certain properties for backward compatibility
    decodeSpecialValues(cloned)
    // validate and filter incomplete providers
    const tidied = await tidyAuthProviders(cloned)
    if (hideSecrets) {
      hideSecretValues(tidied)
    }
    // optionally load file-based values into the providers array
    if (loadFiles) {
      await loadFileValues(tidied)
    }
    return tidied
  }
}

function injectDefaults(defaults, providers) {
  providers.forEach((p) => {
    // OIDC must always have an issuerUri whereas SAML does not; note that the
    // providers might not have a `protocol` field yet; it also might not have
    // any other meaningful property, so check everything to guess its type
    const maybeOidc = 'issuerUri' in p || p.protocol === 'oidc'
    const mapping = maybeOidc ? oidcNameMapping : samlNameMapping
    for (const [env, prov] of Object.entries(mapping)) {
      if (defaults.has(env) && p[prov] === undefined) {
        p[prov] = defaults.get(env)
      }
    }
  })
}

// Prior to the configuration file rewrite, certain properties were encoded by
// the usecases, without a distinguishing prefix. Detect these values found in
// older configuration files and decode them as necessary.
function decodeSpecialValues(providers) {
  for (const provider of providers) {
    if (typeof provider.metadata === 'string' && !provider.metadata.startsWith('<?')) {
      // metadata that does not start with <? is assumed to be encoded
      const decoded = Buffer.from(provider.metadata, 'base64').toString('utf-8')
      provider.metadata = decoded
    }
  }
}

function hideSecretValues(providers) {
  for (const provider of providers) {
    if (provider.clientKeyFile) {
      delete provider.clientKeyFile
    }
    if (provider.clientKey) {
      delete provider.clientKey
    }
  }
}

async function loadFileValues(providers) {
  for (const provider of providers) {
    await maybeReadFile(provider, 'clientCertFile', 'clientCert')
    await maybeReadFile(provider, 'clientKeyFile', 'clientKey')
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
