//
// Copyright 2022 Perforce Software
//
import * as assert from 'node:assert'

/**
 * Read the configuration for the identity providers and produce a login URL.
 *
 * @return {Promise} resolves to a single login URL value.
 * @throws {Error} if deserialization fails for any reason.
 */
export default ({ settingsRepository, getAuthProviders }) => {
  assert.ok(settingsRepository, 'settingsRepository must be defined')
  assert.ok(getAuthProviders, 'getAuthProviders must be defined')
  return async (serviceURI, requestId, instanceId) => {
    assert.ok(serviceURI !== undefined, 'serviceURI must be defined')
    assert.ok(requestId, 'requestId must be defined')
    assert.ok(instanceId, 'instanceId must be defined')
    const providers = await getAuthProviders()
    if (providers) {
      return `${serviceURI}/multi/login/${requestId}?instanceId=${instanceId}`
    }
    const protocol = defaultProtocol(settingsRepository)
    return `${serviceURI}/${protocol}/login/${requestId}?instanceId=${instanceId}`
  }
}

// Returns 'oidc' or 'saml', or whatever value DEFAULT_PROTOCOL has.
function defaultProtocol(settings) {
  const defproto = settings.get('DEFAULT_PROTOCOL')
  if (defproto) {
    return defproto.trim()
  }
  const metadataFile = settings.get('SAML_IDP_METADATA_FILE')
  const metadataUrl = settings.get('SAML_IDP_METADATA_URL')
  const idpSsoUrl = settings.get('SAML_IDP_SSO_URL')
  if (metadataFile || metadataUrl || idpSsoUrl) {
    return 'saml'
  }
  const oidcIssuer = settings.get('OIDC_ISSUER_URI')
  return oidcIssuer ? 'oidc' : 'saml'
}
