//
// Copyright 2020 Perforce Software
//
const fs = require('fs')
const express = require('express')
const router = express.Router()
const passport = require('passport')
const { custom, Issuer, Strategy } = require('openid-client')
const container = require('@lib/container')
const server = require('@lib/server')

const logger = container.resolve('logger')
const findRequest = container.resolve('findRequest')
const receiveUserProfile = container.resolve('receiveUserProfile')
const serviceURI = server.getServiceURI(process.env)

// In order to support both Node.js v10 and v12, detect if this version of
// openid-client provides the custom functionality before attempting its use.
// The timeout is a nice-to-have that we can live without for the sake of
// backward compatibility.
if (custom) {
  custom.setHttpOptionsDefaults({
    // default timeout of 2500ms is just a little too short some times
    timeout: 5000
  })
}

let client = null

function loadStrategy () {
  return new Promise((resolve, reject) => {
    if (process.env.OIDC_ISSUER_URI && client === null) {
      Issuer.discover(process.env.OIDC_ISSUER_URI).then((issuer) => {
        logger.debug('oidc: issuer: %o', issuer.issuer)
        logger.debug('oidc: metadata: %o', issuer.metadata)
        //
        // dynamic registration, maybe not permitted with the oidc-provider npm?
        //
        // issuer.Client.fromUri(
        //   issuer.metadata.registration_endpoint,
        //   'registration_access_token'
        // ).then(function (client) {
        //   log('Discovered client %s %O', client.client_id, client.metadata);
        // })
        //
        // manual client definition
        //
        client = new issuer.Client({
          client_id: process.env.OIDC_CLIENT_ID,
          client_secret: loadClientSecret(),
          redirect_uris: [serviceURI + '/oidc/callback'],
          response_types: ['code'],
          post_logout_redirect_uris: [serviceURI]
        })
        passport.use('openidconnect', new Strategy({
          client,
          passReqToCallback: true,
          usePKCE: process.env.OIDC_CODE_CHALLENGE_METHOD || true
        }, (req, tokenset, userinfo, done) => {
          // tokenset.access_token <= useful for API calls
          req.session.idToken = tokenset.id_token
          return done(null, userinfo)
        }))
        resolve()
      }).catch((err) => {
        reject(err)
      })
    } else {
      resolve()
    }
  })
}

function loadClientSecret () {
  if (process.env.OIDC_CLIENT_SECRET_FILE) {
    return fs.readFileSync(process.env.OIDC_CLIENT_SECRET_FILE, 'utf8').trim()
  }
  return process.env.OIDC_CLIENT_SECRET
}

passport.serializeUser((user, done) => {
  done(null, user)
})

passport.deserializeUser((obj, done) => {
  done(null, obj)
})

if (typeof process.env.OIDC_ISSUER_URI === 'undefined') {
  logger.debug('oidc: passport strategy not available')
}
router.use(passport.initialize())
router.use(passport.session())

function checkStrategy (req, res, next) {
  // log the session identifier to help with cookie debugging
  logger.debug('oidc: requestId: %s, sessionId: %s', req.session.requestId, req.sessionID)
  loadStrategy().then(() => {
    if (passport._strategy('openidconnect')) {
      next()
    } else {
      res.render('no_strategy')
    }
  }).catch((err) => {
    logger.error('oidc: initialization failed:', err)
    res.render('no_strategy')
  })
}

router.get('/login/:id', (req, res, next) => {
  // save the request identifier for request/user mapping
  req.session.requestId = req.params.id
  next()
}, checkStrategy, (req, res, next) => {
  const opts = {
    successReturnToOrRedirect: '/',
    scope: 'openid profile email',
    // default response_mode is fragment which is only good for SPA
    response_mode: 'form_post'
  }
  const request = findRequest(req.session.requestId)
  if (request && request.forceAuthn) {
    logger.debug('oidc: forcing authentication using max_age=0')
    opts.max_age = 0
  }
  passport.authenticate('openidconnect', opts)(req, res, next)
})

router.post('/callback', checkStrategy, passport.authenticate('openidconnect', {
  callback: true,
  successReturnToOrRedirect: '/oidc/success',
  failureRedirect: '/oidc/login_failed'
}))

// eslint-disable-next-line no-unused-vars
router.get('/login_failed', (req, res, next) => {
  // we need a route that is not the login route lest we end up
  // in a redirect loop when a failure occurs
  res.render('login_failed')
})

function checkAuthentication (req, res, next) {
  if (req.isAuthenticated()) {
    next()
  } else {
    logger.debug('oidc: session not authenticated')
    res.redirect('/')
  }
}

// eslint-disable-next-line no-unused-vars
router.get('/success', checkAuthentication, (req, res, next) => {
  logger.debug('oidc: /success, requestId: %s, sessionId: %s', req.session.requestId, req.sessionID)
  if (req.session.successRedirect) {
    res.redirect(req.session.successRedirect)
  } else {
    const request = findRequest(req.session.requestId)
    if (request) {
      // clear the request identifier from the user session
      req.session.requestId = null
      logger.debug('oidc: mapping %s to result %o', request.id, req.user)
      receiveUserProfile(request.userId, req.user)
      const name = req.user.given_name || req.user.name || req.user.email
      res.render('details', { name })
    } else {
      // Cookies were lost during the login process, either because the browser
      // does not like the security settings, or the load balancer does not have
      // sticky sessions enabled.
      logger.warn('oidc: session/cookie missing request identifier')
      res.redirect('/')
    }
  }
})

router.get('/logout', checkAuthentication, (req, res) => {
  req.logout()
  const url = client ? client.endSessionUrl({
    // need the token for the logout redirect to be honored
    id_token_hint: req.session.idToken
  }) : null
  req.session.destroy()
  if (url) {
    logger.debug('oidc: no user for which to logout')
    res.redirect(url)
  } else {
    res.render('logout_success')
  }
})

module.exports = router
