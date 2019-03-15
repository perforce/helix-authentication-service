//
// Copyright 2019 Perforce Software
//
const fs = require('fs')
const express = require('express')
const router = express.Router()
const passport = require('passport')
const { Strategy } = require('passport-saml')
const { users } = require('../store')

const samlOptions = {
  callbackUrl: process.env.SVC_BASE_URI + '/saml/sso',
  logoutCallbackUrl: process.env.SVC_BASE_URI + '/saml/slo',
  entryPoint: process.env.SAML_IDP_SSO_URL,
  logoutUrl: process.env.SAML_IDP_SLO_URL,
  issuer: process.env.SAML_SP_ISSUER || 'urn:example:sp',
  audience: process.env.SP_AUDIENCE || undefined,
  privateCert: process.env.SP_KEY_FILE ? fs.readFileSync(process.env.SP_KEY_FILE) : undefined,
  signatureAlgorithm: process.env.SP_KEY_ALGO || 'sha256'
}
const strategy = new Strategy(samlOptions, (profile, done) => {
  // profile: {
  //   issuer: {...},
  //   sessionIndex: '_1189d45be2aed1519794',
  //   nameID: 'jackson@example.com',
  //   nameIDFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
  //   nameQualifier: undefined,
  //   spNameQualifier: undefined,
  //   fullname: 'Sam L. Jackson',
  //   getAssertionXml: [Function]
  // }
  //
  // produce a "user" object that contains the information that passport-saml
  // requires for logging out via SAML
  //
  return done(null, {
    nameID: profile.nameID,
    nameIDFormat: profile.nameIDFormat,
    sessionIndex: profile.sessionIndex
  })
})
passport.use(strategy)
router.use(passport.initialize())
router.use(passport.session())

passport.serializeUser((user, done) => {
  // serialize the entire object as-is
  done(null, user)
})

passport.deserializeUser((user, done) => {
  done(null, user)
})

router.get('/metadata', (req, res) => {
  let xml = strategy.generateServiceProviderMetadata()
  res.header('Content-Type', 'text/xml').send(xml)
})

router.get('/login', passport.authenticate('saml', {
  failureRedirect: '/saml/login_failed'
}))

router.post('/sso', passport.authenticate('saml', {
  successRedirect: '/saml/details',
  failureRedirect: '/saml/login_failed'
}))

router.get('/login_failed', (req, res, next) => {
  // we need a route that is not the login route lest we end up
  // in a redirect loop when a failure occurs
  res.render('login_failed')
})

function checkAuthentication (req, res, next) {
  if (req.isAuthenticated()) {
    next()
  } else {
    res.redirect('/')
  }
}

router.get('/details', checkAuthentication, (req, res, next) => {
  // The SAML idp may not provide email, which the extension is expecting, so
  // repurpose the nameID as the email, since that should be correct.
  //
  // Use nameID for the cache key because it is the best we have right now;
  // ideally it should be whatever the extensions are using as the user
  // identifier.
  //
  users.set(req.user.nameID, Object.assign({}, req.user, {
    email: req.user.nameID
  }))
  const name = req.user.nameID
  res.render('details', { name })
})

// Legacy route in which extensions receive a SAML response from the client and
// need it to be properly validated, which is hard to do without XML parsing.
router.post('/validate', (req, res, next) => {
  strategy._saml.validatePostResponse(req.body, (err, profile, loggedOut) => {
    if (err) {
      res.status(400).send(`error: ${err}`)
    } else if (loggedOut) {
      res.status(400).send('error: logged out?')
    } else {
      // The SAML idp may not provide email, which the extension is expecting,
      // so repurpose the nameID as the email, since that should be correct.
      res.json(Object.assign({}, profile, {
        email: profile.nameID
      }))
    }
  })
})

router.get('/logout', (req, res, next) => {
  users.delete(req.user.nameID)
  next()
}, passport.authenticate('saml', {
  samlFallback: 'logout-request'
}))

function handleSLO (req, res) {
  req.session.destroy()
  res.redirect('/')
}

// some services use GET and some use POST
router.get('/slo', passport.authenticate('saml', { samlFallback: 'logout-request' }), handleSLO)
router.post('/slo', passport.authenticate('saml', { samlFallback: 'logout-request' }), handleSLO)

module.exports = router
