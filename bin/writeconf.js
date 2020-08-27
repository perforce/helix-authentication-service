//
// Copyright 2020 Perforce Software
//
const fs = require('fs')
const config = readConfiguration()

// shortcut to the settings
const env = config.apps[0].env

if (process.env.DEFAULT_PROTOCOL) {
  env.DEFAULT_PROTOCOL = process.env.DEFAULT_PROTOCOL
}
env.SVC_BASE_URI = process.env.SVC_BASE_URI

// for the time being, configure debug logging to files that rotate
const loggingConf = {
  level: 'debug',
  transport: 'file',
  file: {
    filename: 'auth-svc.log',
    maxsize: 1048576,
    maxfiles: 4
  }
}
const loggingFile = `module.exports = ${JSON.stringify(loggingConf, null, '  ')}`
fs.writeFileSync('logging.config.js', loggingFile, { mode: 0o644 })
// HAS uses require to load the logging config, and the path is relative to the
// bin directory(?), so must include the relative path to the file.
env.LOGGING = '../logging.config.js'

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
fs.writeFileSync('ecosystem.config.js', body, { mode: 0o644 })

function readConfiguration () {
  if (fs.existsSync('../ecosystem.config.js')) {
    return require('../ecosystem.config')
  } else {
    // if the ecosystem file is missing, generate from scratch
    return {
      apps: [{
        name: 'auth-svc',
        node_args: '-r module-alias/register',
        script: './bin/www',
        env: {
          CA_CERT_FILE: 'certs/ca.crt',
          NODE_ENV: 'production',
          SP_CERT_FILE: 'certs/server.crt',
          SP_KEY_FILE: 'certs/server.key',
          SVC_BASE_URI: 'https://localhost:3000'
        }
      }]
    }
  }
}
