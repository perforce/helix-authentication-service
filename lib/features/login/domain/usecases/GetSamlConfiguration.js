//
// Copyright 2023 Perforce Software
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
  getSamlAuthnContext,
  fetchSamlMetadata,
  getAuthProviders
}) => {
  assert.ok(getSamlAuthnContext, 'getSamlAuthnContext must be defined')
  assert.ok(fetchSamlMetadata, 'fetchSamlMetadata must be defined')
  assert.ok(getAuthProviders, 'getAuthProviders must be defined')
  return async (providerId) => {
    const providers = await getAuthProviders()
    const provider = findProvider(providerId, providers)
    let options = await buildOptionsFromProvider(provider, getSamlAuthnContext)
    let metadata = {
      metadataFile: provider.metadataFile,
      metadataUrl: provider.metadataUrl,
      metadata: provider.metadata
    }

    // merge IdP metadata, if any, with discovered settings
    options = await fetchSamlMetadata(options, metadata)

    // convert the certificate(s) to a single line for passport-saml
    if (Array.isArray(options.cert)) {
      options.cert = options.cert.map((e) => massageCertificate(e))
    } else if (typeof options.cert === 'string') {
      options.cert = massageCertificate(options.cert)
    } else {
      // node-saml now requires the cert property to be present
      throw new Error('IdP certificate is required, please set IDP_CERT_FILE')
    }
    return options
  }
}

function findProvider(providerId, providers) {
  if (providerId) {
    const provider = providers.find((e) => e.id === providerId)
    if (provider) {
      return provider
    } else {
      throw new Error(`no such provider: ${providerId}`)
    }
  } else {
    const provider = providers.find((e) => e.protocol === 'saml')
    if (provider) {
      return provider
    } else {
      throw new Error('no saml provider found')
    }
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
  if ('disableContext' in provider) {
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
  } else if (provider.idpCert) {
    configured.cert = massageCertificate(provider.idpCert)
  }
  if ('wantAssertionSigned' in provider) {
    configured.wantAssertionsSigned = provider.wantAssertionSigned
  }
  if ('wantResponseSigned' in provider) {
    configured.wantAuthnResponseSigned = provider.wantResponseSigned
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
