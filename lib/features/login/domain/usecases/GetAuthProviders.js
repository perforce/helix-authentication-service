//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'
import * as fs from 'node:fs/promises'
import * as url from 'node:url'
import { MetadataReader } from 'passport-saml-metadata'

/**
 * Read the configuration for the identity providers. Any provider that lacks an
 * id or label property is not fully configured and unlikely to be functional.
 *
 * @return {Promise} resolves to array of identity providers.
 * @throws {Error} if deserialization fails for any reason.
 */
export default ({ settingsRepository }) => {
  assert.ok(settingsRepository, 'settingsRepository must be defined')
  return async () => {
    // load any explicitly configured identity providers
    const providers = await loadAuthProviders(settingsRepository)
    // convert classic OIDC and SAML settings to providers
    await convertToProviders(settingsRepository, providers)
    // load file-based values into the providers array
    await loadFileValues(providers)
    // attempt to assign a protocol as it is easy to forget
    ensureProtocol(providers)
    // Assign unique identifiers to each provider, sorting them by label for
    // consistent numbering. While this only matters during the runtime of
    // the service, it is important that multiple service instances use the
    // same identifiers for the same set of providers.
    ensureIdentifiers(providers)
    return providers
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

async function loadFileValues(providers) {
  for (const provider of providers) {
    await maybeReadFile(provider, 'clientSecretFile', 'clientSecret')
    await maybeReadFile(provider, 'idpCertFile', 'idpCert')
    await maybeReadFile(provider, 'metadataFile', 'metadata')
  }
}

function ensureProtocol(providers) {
  providers.forEach((e) => {
    if (!('protocol' in e)) {
      // OIDC must always have an issuerUri whereas SAML does not
      if (e.issuerUri) {
        e.protocol = 'oidc'
      } else {
        e.protocol = 'saml'
      }
    }
  })
}

// side-effect: sorts identifiers by label
export function ensureIdentifiers(providers) {
  providers.sort((a, b) => {
    if (a.label && b.label) {
      return a.label.localeCompare(b.label)
    }
    return 0
  })
  providers.forEach((e, i) => {
    // only assign identifiers to providers that have a label
    if (!('id' in e) && e.label) {
      e.id = `${e.protocol}-${i}`
    }
  })
}

async function convertToProviders(settingsRepository, providers) {
  const defproto = settingsRepository.get('DEFAULT_PROTOCOL')
  const oidc = convert(settingsRepository, oidcNameMapping)
  if (oidc !== null) {
    ensureLabel(oidc, 'issuerUri')
    oidc['protocol'] = 'oidc'
    // ensure boolean properties are boolean values
    if (oidc.selectAccount) {
      oidc.selectAccount = true
    }
    if (oidc.label) {
      // assign a static identifier for converted provider
      oidc['id'] = 'oidc'
    }
    if (defproto === 'oidc') {
      oidc['default'] = true
    }
    providers.push(oidc)
  }
  const saml = convert(settingsRepository, samlNameMapping)
  if (saml !== null) {
    // try various values to generate a suitable label
    ensureLabel(saml, 'metadataUrl')
    ensureLabel(saml, 'idpEntityId')
    ensureLabel(saml, 'signonUrl')
    if (!saml.label && 'metadataFile' in saml) {
      await maybeReadFile(saml, 'metadataFile', 'metadata')
      const reader = new MetadataReader(saml['metadata'])
      if (reader.entityId) {
        saml['label'] = reader.entityId
      }
    }
    // ensure boolean properties are boolean values
    saml.wantAssertionSigned = assessTruth(saml.wantAssertionSigned)
    saml.wantResponseSigned = assessTruth(saml.wantResponseSigned)
    saml['protocol'] = 'saml'
    if (saml.label) {
      // assign a static identifier for converted provider
      saml['id'] = 'saml'
    }
    if (defproto === 'saml') {
      saml['default'] = true
    }
    providers.push(saml)
  }
}

// Mapping of OIDC settings from environment variable names to provider properties.
const oidcNameMapping = {
  'OIDC_CLIENT_ID': 'clientId',
  'OIDC_CLIENT_SECRET': 'clientSecret',
  'OIDC_CLIENT_SECRET_FILE': 'clientSecretFile',
  'OIDC_CODE_CHALLENGE_METHOD': 'codeChallenge',
  'OIDC_INFO_LABEL': 'label',
  'OIDC_ISSUER_URI': 'issuerUri',
  'OIDC_SELECT_ACCOUNT': 'selectAccount',
  'OIDC_TOKEN_SIGNING_ALGO': 'signingAlgo'
}

// Mapping of SAML settings from environment variable names to provider properties.
const samlNameMapping = {
  'IDP_CERT': 'idpCert',
  'IDP_CERT_FILE': 'idpCertFile',
  'SAML_AUTHN_CONTEXT': 'authnContext',
  'SAML_DISABLE_CONTEXT': 'disableContext',
  'SAML_IDP_ENTITY_ID': 'idpEntityId',
  'SAML_IDP_METADATA_FILE': 'metadataFile',
  'SAML_IDP_METADATA_URL': 'metadataUrl',
  'SAML_IDP_SLO_URL': 'logoutUrl',
  'SAML_IDP_SSO_URL': 'signonUrl',
  'SAML_INFO_LABEL': 'label',
  'SAML_NAMEID_FORMAT': 'nameIdFormat',
  'SAML_SP_AUDIENCE': 'audience',
  'SAML_SP_ENTITY_ID': 'spEntityId',
  'SAML_WANT_ASSERTION_SIGNED': 'wantAssertionSigned',
  'SAML_WANT_RESPONSE_SIGNED': 'wantResponseSigned',
  'SP_KEY_ALGO': 'keyAlgorithm'
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
    const contents = await fs.readFile(filename, 'utf8')
    provider[valueKey] = contents.trim()
    delete provider[fileKey]
  }
}

function ensureLabel(provider, uriName) {
  if (!provider.label && uriName in provider) {
    const maybeUri = provider[uriName]
    try {
      const u = new url.URL(maybeUri)
      provider['label'] = u.hostname
    } catch (err) {
      // maybe not a URL but an entity ID
      provider['label'] = maybeUri
    }
  }
}

// Check if setting is defined and equals 'false', otherwise return true.
function assessTruth(value) {
  if (value === undefined || value === null || value.toString().toLowerCase() === 'false') {
    return false
  }
  return true
}
