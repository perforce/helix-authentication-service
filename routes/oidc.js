//
// Copyright 2019 Perforce Software
//
const express = require('express')
const router = express.Router()
const passport = require('passport')
const { Issuer, Strategy } = require('openid-client')

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
  const client = new issuer.Client({
    client_id: process.env.OIDC_CLIENT_ID,
    client_secret: process.env.OIDC_CLIENT_SECRET
  })
  passport.use('openidconnect', new Strategy({
    client
  }, (tokenset, userinfo, done) => {
    console.log('tokenset', tokenset)
    // console.log('access_token', tokenset.access_token)
    // console.log('id_token', tokenset.id_token)
    console.log('claims', tokenset.claims)
    console.log('userinfo', userinfo)
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
  failureRedirect: '/oidc/login'
}))

router.get('/details', (req, res, next) => {
  console.log(req.user)
  res.json(req.user)
})

// Destroy both the local session and
// revoke the access_token
router.get('/logout', function (req, res) {
  // const revoke = process.env.OIDC_TOKEN_REVOKE;
  // if (!revoke) {
  //   // can't be done...just redirect to the root
  //   console.log('No revoke URL defined')
  //   res.redirect('/')
  // }
  // request.post(process.env.OIDC_BASE_URI + process.env.OIDC_TOKEN_REVOKE, {
  //   'form': {
  //     'client_id': process.env.OIDC_CLIENT_ID,
  //     'client_secret': process.env.OIDC_CLIENT_SECRET,
  //     'token': req.session.accessToken,
  //     'token_type_hint': 'access_token'
  //   }
  // }, function (err, respose, body) {
  //   console.log('Session Revoked');
  //   res.redirect('/');
  // });
})

module.exports = router
