//
// Copyright 2020 Perforce Software
//
const fs = require('fs')
const config = require('../ecosystem.config')

// shortcut to the settings
const env = config.apps[0].env

if (process.env.DEFAULT_PROTOCOL) {
  env.DEFAULT_PROTOCOL = process.env.DEFAULT_PROTOCOL
}
env.SVC_BASE_URI = process.env.SVC_BASE_URI

// either OIDC is defined or it is completely wiped
if (process.env.OIDC_ISSUER_URI) {
  env.OIDC_ISSUER_URI = process.env.OIDC_ISSUER_URI
  env.OIDC_CLIENT_ID = process.env.OIDC_CLIENT_ID
  env.OIDC_CLIENT_SECRET_FILE = process.env.OIDC_CLIENT_SECRET_FILE
} else {
  // if no OIDC issuer URI then remove all OIDC settings
  delete env.OIDC_ISSUER_URI
  delete env.OIDC_CLIENT_ID
  delete env.OIDC_CLIENT_SECRET_FILE
}
// always use the OIDC_CLIENT_SECRET_FILE setting over the bare secret
delete env.OIDC_CLIENT_SECRET

// either SAML is defined or it is completely wiped
if (process.env.SAML_IDP_METADATA_URL || process.env.SAML_IDP_SSO_URL) {
  if (process.env.SAML_IDP_METADATA_URL) {
    env.SAML_IDP_METADATA_URL = process.env.SAML_IDP_METADATA_URL
  } else {
    delete env.SAML_IDP_METADATA_URL
  }
  if (process.env.SAML_IDP_SSO_URL) {
    env.SAML_IDP_SSO_URL = process.env.SAML_IDP_SSO_URL
  } else {
    delete env.SAML_IDP_SSO_URL
    delete env.SAML_IDP_SLO_URL
  }
  env.SAML_SP_ENTITY_ID = process.env.SAML_SP_ENTITY_ID
} else {
  // if not using SAML strategy then remove all SAML settings
  delete env.SAML_IDP_METADATA_URL
  delete env.SAML_SP_ENTITY_ID
  delete env.SAML_IDP_SSO_URL
  delete env.SAML_IDP_SLO_URL
}

const body = `module.exports = ${JSON.stringify(config, null, '  ')}`
fs.writeFileSync('../ecosystem.config.js', body, { mode: 0o644 })
