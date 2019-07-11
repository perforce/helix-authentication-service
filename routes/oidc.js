//
// Copyright 2019 Perforce Software
//
const debug = require('debug')('auth:server')
const express = require('express')
const router = express.Router()
const passport = require('passport')
const { Issuer, Strategy } = require('openid-client')
const { users, requests } = require('../store')

let client = null

function loadStrategy () {
  return new Promise((resolve, reject) => {
    if (process.env.OIDC_ISSUER_URI && client === null) {
      Issuer.discover(process.env.OIDC_ISSUER_URI).then((issuer) => {
        debug('issuer: %o', issuer.issuer)
        debug('metadata: %o', issuer.metadata)
        //
        // dynamic registration, maybe not permitted with the oidc-provider npm?
        //
        // issuer.Client.fromUri(
        //   issuer.metadata.registration_endpoint,
        //   'registration_access_token'
        // ).then(function (client) {
        //   console.log('Discovered client %s %O', client.client_id, client.metadata);
        // })
        //
        // manual client definition
        //
        client = new issuer.Client({
          client_id: process.env.OIDC_CLIENT_ID,
          client_secret: process.env.OIDC_CLIENT_SECRET,
          post_logout_redirect_uris: [process.env.SVC_BASE_URI]
        })
        const params = {
          // Some services require the absolute URI that is whitelisted in the client
          // app settings; the test oidc-provider is not one of these.
          redirect_uri: process.env.SVC_BASE_URI + '/oidc/callback'
        }
        passport.use('openidconnect', new Strategy({
          client,
          params,
          passReqToCallback: true
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

passport.serializeUser((user, done) => {
  done(null, user)
})

passport.deserializeUser((obj, done) => {
  done(null, obj)
})

router.use(passport.initialize())
router.use(passport.session())

function checkStrategy (req, res, next) {
  loadStrategy().then(() => {
    if (passport._strategy('openidconnect')) {
      next()
    } else {
      res.render('no_strategy')
    }
  }).catch((err) => {
    console.error('OIDC initialization failed:', err)
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
    scope: 'openid profile email'
  }
  const user = requests.getIfPresent(req.session.requestId)
  if (user && user.forceAuthn) {
    debug('forcing OIDC authentication using max_age=0')
    opts['max_age'] = 0
  }
  passport.authenticate('openidconnect', opts)(req, res, next)
})

router.get('/callback', checkStrategy, passport.authenticate('openidconnect', {
  callback: true,
  successReturnToOrRedirect: '/oidc/success',
  failureRedirect: '/oidc/login_failed'
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

router.get('/success', checkAuthentication, (req, res, next) => {
  if (req.session.successRedirect) {
    res.redirect(req.session.successRedirect)
  } else {
    const user = requests.getIfPresent(req.session.requestId)
    // clear the request identifier from the user session
    req.session.requestId = null
    users.set(user.id, req.user)
    const name = req.user.given_name || req.user.name || req.user.email
    res.render('details', { name })
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
    res.redirect(url)
  } else {
    res.render('logout_success')
  }
})

module.exports = router
