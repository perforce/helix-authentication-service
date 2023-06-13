//
// Copyright 2023 Perforce Software
//

// Mapping of settings whose names changed (old to new).
export const renamedSettings = {
  'SAML_SP_ISSUER': 'SAML_SP_ENTITY_ID',
  'SAML_IDP_ISSUER': 'SAML_IDP_ENTITY_ID',
  'SP_CERT_FILE': 'CERT_FILE',
  'SP_KEY_FILE': 'KEY_FILE',
}

// Mapping of OIDC settings from environment variable names to provider properties.
export const oidcNameMapping = {
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
export const samlNameMapping = {
  'IDP_CERT': 'idpCert',
  'IDP_CERT_FILE': 'idpCertFile',
  'SAML_AUTHN_CONTEXT': 'authnContext',
  'SAML_DISABLE_CONTEXT': 'disableContext',
  'SAML_IDP_ENTITY_ID': 'idpEntityId',
  'SAML_IDP_METADATA': 'metadata',
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

// List of settings that are neither shared nor received via the REST API.
export const blockedSettings = [
  'ADMIN_ENABLED',
  'ADMIN_P4_AUTH',
  'ADMIN_PASSWD_FILE',
  'ADMIN_USERNAME',
  'KEY_FILE',
  'KEY',
  'OAUTH_SIGNING_KEY_FILE',
  'OAUTH_SIGNING_KEY',
  'PFX_FILE',
  'PFX',
  'REDIS_KEY_FILE',
  'REDIS_KEY',
  'SP_KEY_FILE',
  'SP_KEY',
]
