//
// Copyright 2019 Perforce Software
//
const express = require('express')
const router = express.Router()
const passport = require('passport')
const { Issuer, Strategy } = require('openid-client')
const { users } = require('../store')

let client = null

Issuer.discover(process.env.OIDC_ISSUER_URI).then((issuer) => {
  // console.info(issuer.issuer)
  // console.info(issuer.metadata)
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

passport.serializeUser((user, done) => {
  done(null, user)
})

passport.deserializeUser((obj, done) => {
  done(null, obj)
})

router.use(passport.initialize())
router.use(passport.session())

router.get('/login', passport.authenticate('openidconnect', {
  successReturnToOrRedirect: '/',
  scope: 'openid profile email'
}))

router.get('/callback', passport.authenticate('openidconnect', {
  callback: true,
  successReturnToOrRedirect: '/oidc/details',
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

router.get('/details', checkAuthentication, (req, res, next) => {
  // Use email for the cache key because it is the best we have right now.
  users.set(req.user.email, req.user)
  const name = req.user.given_name || req.user.name || req.user.email
  res.render('details', { name })
})

router.get('/logout', checkAuthentication, (req, res) => {
  users.delete(req.user.email)
  req.logout()
  const url = client.endSessionUrl({
    // need the token for the logout redirect to be honored
    id_token_hint: req.session.idToken
  })
  req.session.destroy()
  res.redirect(url || '/')
})

module.exports = router
