//
// Copyright 2019 Perforce Software
//
const express = require('express')
const router = express.Router()

/* GET home page. */
router.get('/', (req, res, next) => {
  // detect if the system has not yet been configured by an administrator
  const showHelp = (process.env.OIDC_ISSUER_URI === undefined && process.env.SAML_IDP_SSO_URL === undefined)
  res.render('index', { showHelp })
})

module.exports = router
