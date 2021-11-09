//
// Copyright 2020-2021 Perforce Software
//
const fs = require('fs')
const config = readConfiguration()

// shortcut to the settings
const env = config.apps[0].env

if (process.env.DEFAULT_PROTOCOL) {
  env.DEFAULT_PROTOCOL = process.env.DEFAULT_PROTOCOL
}
env.SVC_BASE_URI = process.env.SVC_BASE_URI

// Ensure the logging.config.cjs file is readable by all users to avoid difficult
// to debug situations where the logging is not working and no errors are
// displayed.
fs.chmodSync('logging.config.cjs', 0o644)
if (fs.existsSync('bin/www.js')) {
  // As a plain Node.js application, the logging require path is relative to the
  // bin/www.js script.
  env.LOGGING = '../logging.config.cjs'
} else {
  // As a single binary, a full path is required since any relative path would
  // be treated as internal to the binary archive.
  env.LOGGING = `${process.cwd()}/logging.config.cjs`
}

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

// detect whether to use the single binary or the bin/www.js "executable"
if (fs.existsSync('./helix-auth-svc')) {
  config.apps[0].script = './helix-auth-svc'
} else {
  config.apps[0].script = './bin/www.js'
}

const body = `module.exports = ${JSON.stringify(config, null, '  ')}\n`
fs.writeFileSync('ecosystem.config.cjs', body, { mode: 0o644 })

function readConfiguration () {
  // node require paths are relative to this file, not cwd
  if (fs.existsSync('../ecosystem.config.cjs')) {
    return require('../ecosystem.config')
  } else {
    // if the ecosystem file is missing, generate from scratch
    return {
      apps: [{
        name: 'auth-svc',
        script: './bin/www.js',
        env: {
          CA_CERT_FILE: 'certs/ca.crt',
          NODE_ENV: 'production',
          CERT_FILE: 'certs/server.crt',
          KEY_FILE: 'certs/server.key',
          SVC_BASE_URI: 'https://localhost:3000'
        }
      }]
    }
  }
}
