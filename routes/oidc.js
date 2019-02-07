//
// Copyright 2018 Perforce Software
//
const express = require('express')
const router = express.Router()

router.get('/login', (req, res, next) => {
  res.render('login')
})

router.get('/data', (req, res, next) => {
  res.json({
    name: 'Sam L. Jackson',
    email: 'saml_jackson@example.com'
  })
})

module.exports = router
