//
// Copyright 2019 Perforce Software
//
const express = require('express')
const router = express.Router()

/* GET home page. */
// eslint-disable-next-line no-unused-vars
router.get('/', (req, res, next) => {
  // detect if the system has not yet been configured by an administrator
  const hasSaml = (process.env.SAML_IDP_METADATA_FILE || process.env.SAML_IDP_METADATA_URL || process.env.SAML_IDP_SSO_URL)
  const hasOidc = process.env.OIDC_ISSUER_URI !== undefined
  const hasScim = process.env.P4PORT !== undefined
  const showHelp = !(hasOidc || hasSaml || hasScim)
  res.render('index', { showHelp })
})

module.exports = router
