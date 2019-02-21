//
// Copyright 2019 Perforce Software
//
const express = require('express')
const router = express.Router()
const passport = require('passport')
const { Issuer, Strategy } = require('openid-client')
const transitory = require('transitory')

// Set up an in-memory cache of the user details; could have used
// github:isaacs/node-lru-cache but that lacks fine cache control, while
// github:aholstenson/transitory is a bit more sophisticated.
const userCache = transitory()
  .expireAfterWrite(60 * 60 * 1000)
  .expireAfterRead(5 * 60 * 1000)
  .build()
// Nonetheless, still need to prune stale entries occasionally.
setInterval(() => userCache.cleanUp(), 5 * 60 * 1000)

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
    client_secret: process.env.OIDC_CLIENT_SECRET
  })
  const params = {
    // Some services require the absolute URI that is whitelisted in the client
    // app settings; the test oidc-provider is not one of these.
    redirect_uri: process.env.OIDC_REDIRECT_URI
  }
  passport.use('openidconnect', new Strategy({
    client,
    params
  }, (tokenset, userinfo, done) => {
    // console.log('tokenset', tokenset)
    // console.log('access_token', tokenset.access_token)
    // console.log('id_token', tokenset.id_token)
    // console.log('claims', tokenset.claims)
    // console.log('userinfo', userinfo)
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
  // using email for the cache key because it is the best we have right now
  userCache.set(req.user.email, req.user)
  const name = req.user.given_name || req.user.name || req.user.email
  res.render('details', { name })
})

router.get('/data/:id', (req, res, next) => {
  // the params are automatically decoded
  let user = userCache.get(req.params.id)
  if (user) {
    res.json(user)
  } else {
    next()
  }
})

router.get('/logout', checkAuthentication, (req, res) => {
  userCache.delete(req.user.email)
  req.logout()
  const url = client.endSessionUrl({
    post_logout_redirect_uri: '/'
  })
  res.redirect(url || '/')
})

module.exports = router
