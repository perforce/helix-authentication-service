//
// Copyright 2020-2021 Perforce Software
//
import dotenv from 'dotenv'

// Importing this module before other application modules will ensure that the
// environment is properly prepared, despite using the early-binding import. The
// unit tests will effectively "override" this module by loading a similar
// module _before_ this module is imported by the application modules.

dotenv.config()

// rename settings from old names to new names
const renamedSettings = {
  'SAML_SP_ISSUER': 'SAML_SP_ENTITY_ID',
  'SAML_IDP_ISSUER': 'SAML_IDP_ENTITY_ID',
  'SP_CERT_FILE': 'CERT_FILE',
  'SP_KEY_FILE': 'KEY_FILE',
}
for (const [oldname, newname] of Object.entries(renamedSettings)) {
  if (process.env[newname] === undefined && oldname in process.env) {
    process.env[newname] = process.env[oldname]
  }
}
