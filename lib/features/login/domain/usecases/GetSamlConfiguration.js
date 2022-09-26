//
// Copyright 2022 Perforce Software
//
import * as assert from 'node:assert'
import { readFile } from 'node:fs/promises';

/**
 * Load and prepare the SAML configuration for the passport-saml library.
 *
 * @param {Object} providerId - optional provider identifier.
 * @returns {Promise} resolves to the SAML configuration data.
 * @throws {Error} if preparation fails for any reason.
 */
export default ({
  settingsRepository,
  getSamlAuthnContext,
  fetchSamlMetadata,
  getAuthProviders
}) => {
  assert.ok(settingsRepository, 'settingsRepository must be defined')
  assert.ok(getSamlAuthnContext, 'getSamlAuthnContext must be defined')
  assert.ok(fetchSamlMetadata, 'fetchSamlMetadata must be defined')
  assert.ok(getAuthProviders, 'getAuthProviders must be defined')
  return async (providerId) => {
    let options
    let metadata
    if (providerId) {
      const providers = await getAuthProviders()
      const provider = providers.find((e) => e.id === providerId)
      if (provider) {
        options = await buildOptionsFromProvider(provider, getSamlAuthnContext)
        metadata = provider.metadataFile || provider.metadataUrl || undefined
      } else {
        throw new Error('no such provider')
      }
    } else {
      options = await buildOptionsFromEnv(settingsRepository, getSamlAuthnContext)
      if (settingsRepository.has('SAML_IDP_METADATA_FILE')) {
        metadata = settingsRepository.get('SAML_IDP_METADATA_FILE')
      } else if (settingsRepository.has('SAML_IDP_METADATA_URL')) {
        metadata = settingsRepository.get('SAML_IDP_METADATA_URL')
      }
    }

    // merge IdP metadata, if any, with discovered settings
    options = await fetchSamlMetadata(options, metadata)

    // convert the certificate(s) to a single line for passport-saml
    if (Array.isArray(options.cert)) {
      options.cert = options.cert.map((e) => massageCertificate(e))
    } else if (typeof options.cert === 'string') {
      options.cert = massageCertificate(options.cert)
    }
    return options
  }
}

async function buildOptionsFromProvider(provider, getSamlAuthnContext) {
  const authnContext = getSamlAuthnContext(provider.authnContext)
  const configured = { authnContext }
  if (provider.signonUrl) {
    configured.entryPoint = provider.signonUrl
  }
  if (provider.logoutUrl) {
    configured.logoutUrl = provider.logoutUrl
  }
  if (provider.spEntityId) {
    configured.issuer = provider.spEntityId
  }
  if (provider.idpEntityId) {
    configured.idpIssuer = provider.idpEntityId
  }
  // allow per-provider setting for forcing authentication
  if ('forceAuthn' in provider) {
    configured.forceAuthn = provider.forceAuthn
  }
  if (provider.audience) {
    configured.audience = provider.audience
  }
  if (provider.disableContext) {
    configured.disableRequestedAuthnContext = provider.disableContext
  }
  if (provider.keyAlgorithm) {
    configured.signatureAlgorithm = provider.keyAlgorithm
  }
  if (provider.nameIdFormat) {
    configured.identifierFormat = provider.nameIdFormat
  }
  if (provider.idpCertFile) {
    configured.cert = await readIdentityCert(provider.idpCertFile)
  }
  return configured
}

async function buildOptionsFromEnv(settings, getSamlAuthnContext) {
  const authnContext = getSamlAuthnContext()
  const configured = { authnContext }
  if (settings.has('SAML_IDP_SSO_URL')) {
    configured.entryPoint = settings.get('SAML_IDP_SSO_URL')
  }
  if (settings.has('SAML_IDP_SLO_URL')) {
    configured.logoutUrl = settings.get('SAML_IDP_SLO_URL')
  }
  if (settings.has('SAML_SP_ENTITY_ID')) {
    configured.issuer = settings.get('SAML_SP_ENTITY_ID')
  } else if (settings.has('SAML_SP_ISSUER')) {
    configured.issuer = settings.get('SAML_SP_ISSUER')
  }
  if (settings.has('SAML_IDP_ENTITY_ID')) {
    configured.idpIssuer = settings.get('SAML_IDP_ENTITY_ID')
  } else
    if (settings.has('SAML_IDP_ISSUER')) {
      configured.idpIssuer = settings.get('SAML_IDP_ISSUER')
    }
  if (settings.has('SAML_SP_AUDIENCE')) {
    configured.audience = settings.get('SAML_SP_AUDIENCE')
  }
  if (settings.has('SAML_DISABLE_CONTEXT')) {
    configured.disableRequestedAuthnContext = settings.get('SAML_DISABLE_CONTEXT')
  }
  if (settings.has('SP_KEY_ALGO')) {
    configured.signatureAlgorithm = settings.get('SP_KEY_ALGO')
  }
  if (settings.has('SAML_NAMEID_FORMAT')) {
    configured.identifierFormat = settings.get('SAML_NAMEID_FORMAT')
  }
  if (settings.has('IDP_CERT_FILE')) {
    configured.cert = await readIdentityCert(settings.get('IDP_CERT_FILE'))
  }
  return configured
}

// Process the PEM-encoded certificate into the string that passport-saml expects.
async function readIdentityCert(fpath) {
  const text = await readFile(fpath, { encoding: 'utf-8' })
  return massageCertificate(text)
}

// Format the certificate text into a single line without begin/end lines.
function massageCertificate(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l =>
    l !== '-----BEGIN CERTIFICATE-----' && l !== '-----END CERTIFICATE-----' && l.length > 0
  )
  return lines.join('')
}
