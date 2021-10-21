//
// Copyright 2021 Perforce Software
//

// Returns either 'oidc' or 'saml' based on configuration.
export function defaultProtocol (settings) {
  const defproto = settings.get('DEFAULT_PROTOCOL')
  if (defproto) {
    return defproto
  }
  if (isSamlConfigured(settings)) {
    return 'saml'
  }
  const oidcIssuer = settings.get('OIDC_ISSUER_URI')
  return oidcIssuer ? 'oidc' : 'saml'
}

// Returns `true` if SAML is configured, otherwise `false`.
export function isSamlConfigured (settings) {
  const metadataFile = settings.get('SAML_IDP_METADATA_FILE')
  const metadataUrl = settings.get('SAML_IDP_METADATA_URL')
  const idpSsoUrl = settings.get('SAML_IDP_SSO_URL')
  if (metadataFile || metadataUrl || idpSsoUrl) {
    return true
  }
  return false
}
