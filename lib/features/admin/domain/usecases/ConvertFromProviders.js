//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'

/**
 * Convert the providers in AUTH_PROVIDERS into classic settings, if one OIDC
 * and SAML provider are defined, otherwise do nothing.
 *
 * @param {Map} settings - Map-like object containing all settings.
 */
export default () => {
  return (settings) => {
    assert.ok(settings, 'settings must be provided')
    if (settings.has('AUTH_PROVIDERS')) {
      const providers = settings.get('AUTH_PROVIDERS')
      const oidcProviders = providers.filter((e) => e.protocol === 'oidc')
      if (oidcProviders.length == 1) {
        // convert the one OIDC provider to standard settings
        convert(settings, oidcProviders[0], oidcNameMapping)
      }
      const samlProviders = providers.filter((e) => e.protocol === 'saml')
      if (samlProviders.length == 1) {
        // convert the one SAML provider to standard settings
        convert(settings, samlProviders[0], samlNameMapping)
      }
      if (oidcProviders.length < 2 && samlProviders.length < 2) {
        // If only (at most) the one OIDC and SAML provider, can delete the
        // incoming array that is only needed for the client/server API.
        settings.delete('AUTH_PROVIDERS')
      }
    }
  }
}

// Mapping of OIDC settings from environment variable names to provider properties.
const oidcNameMapping = {
  'OIDC_CLIENT_ID': 'clientId',
  'OIDC_CLIENT_SECRET': 'clientSecret',
  'OIDC_CODE_CHALLENGE_METHOD': 'codeChallenge',
  'OIDC_INFO_LABEL': 'label',
  'OIDC_ISSUER_URI': 'issuerUri',
  'OIDC_SELECT_ACCOUNT': 'selectAccount',
  'OIDC_TOKEN_SIGNING_ALGO': 'signingAlgo'
}

// Mapping of SAML settings from environment variable names to provider properties.
const samlNameMapping = {
  'IDP_CERT': 'idpCert',
  'SAML_AUTHN_CONTEXT': 'authnContext',
  'SAML_DISABLE_CONTEXT': 'disableContext',
  'SAML_IDP_ENTITY_ID': 'idpEntityId',
  'SAML_IDP_METADATA': 'metadata',
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

function convert(settings, provider, mapping) {
  for (const [env, prov] of Object.entries(mapping)) {
    if (prov in provider && provider[prov] !== '') {
      settings.set(env, provider[prov])
    } else {
      settings.delete(env)
    }
  }
}
