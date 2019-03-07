//
// Copyright 2019 Perforce Software
//
const fs = require('fs')
const express = require('express')
const router = express.Router()
const passport = require('passport')
const { Strategy } = require('passport-saml')
const transitory = require('transitory')

// How long to wait (in ms) for user details before returning 408.
const requestTimeout = 60 * 1000

// Set up an in-memory cache of the user details; could have used
// github:isaacs/node-lru-cache but that lacks fine cache control, while
// github:aholstenson/transitory is a bit more sophisticated.
const userCache = transitory()
  .expireAfterWrite(60 * 60 * 1000)
  .expireAfterRead(5 * 60 * 1000)
  .build()
// Nonetheless, still need to prune stale entries occasionally.
setInterval(() => userCache.cleanUp(), 5 * 60 * 1000)

const samlOptions = {
  callbackUrl: process.env.SAML_SP_SSO_URL || 'http://localhost:3000/saml/sso',
  logoutCallbackUrl: process.env.SAML_SP_SLO_URL || 'http://localhost:3000/saml/slo',
  entryPoint: process.env.SAML_IDP_SSO_URL || 'http://localhost:7000/saml/sso',
  logoutUrl: process.env.SAML_IDP_SLO_URL || 'http://localhost:7000/saml/slo',
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
  // using nameID for the cache key because it is the best we have right now
  userCache.set(req.user.nameID, req.user)
  const name = req.user.nameID
  res.render('details', { name })
})

router.get('/data/:id', async (req, res, next) => {
  // the params are automatically decoded
  try {
    let user = await new Promise((resolve, reject) => {
      if (userCache.has(req.params.id)) {
        // data is ready, no need to wait
        resolve(userCache.get(req.params.id))
      } else {
        // wait for the data to become available
        const timeout = setInterval(() => {
          if (userCache.has(req.params.id)) {
            clearInterval(timeout)
            resolve(userCache.get(req.params.id))
          }
        }, 1000)
        // but don't wait too long
        req.connection.setTimeout(requestTimeout, () => {
          clearInterval(timeout)
          reject(new Error('timeout'))
        })
      }
    })
    // The SAML idp may not provide email, which the extension is expecting, so
    // repurpose the nameID as the email, since that should be correct.
    res.json(Object.assign({}, user, {
      email: user.nameID
    }))
  } catch (err) {
    res.status(408).send('Request Timeout')
  }
})

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
  userCache.delete(req.user.nameID)
  next()
}, passport.authenticate('saml', {
  samlFallback: 'logout-request'
}))

router.post('/slo', passport.authenticate('saml', {
  samlFallback: 'logout-request'
}), (req, res) => {
  res.redirect('/')
})

module.exports = router
