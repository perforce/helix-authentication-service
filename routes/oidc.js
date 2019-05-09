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

if (process.env.OIDC_ISSUER_URI) {
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
  }).catch((err) => {
    console.error(err)
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
  if (passport._strategy('openidconnect')) {
    next()
  } else {
    res.render('no_strategy')
  }
}

router.get('/login/:id', (req, res, next) => {
  // save the request identifier for request/user mapping
  req.session.requestId = req.params.id
  next()
}, checkStrategy, passport.authenticate('openidconnect', {
  successReturnToOrRedirect: '/',
  scope: 'openid profile email'
}))

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
    let path = req.session.successRedirect
    req.session.successRedirect = null
    res.redirect(path)
  } else {
    const userId = requests.getIfPresent(req.session.requestId)
    users.set(userId, req.user)
    const name = req.user.given_name || req.user.name || req.user.email
    res.render('details', { name })
  }
})

router.get('/logout', checkAuthentication, (req, res) => {
  req.logout()
  const url = client.endSessionUrl({
    // need the token for the logout redirect to be honored
    id_token_hint: req.session.idToken
  })
  req.session.destroy()
  if (url) {
    res.redirect(url)
  } else {
    res.render('logout_success')
  }
})

module.exports = router
