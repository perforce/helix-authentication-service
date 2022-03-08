//
// Copyright 2020-2021 Perforce Software
//
import * as fs from 'node:fs'
import express from 'express'
import passport from 'passport'
import { custom, generators, Issuer, Strategy } from 'openid-client'
import container from 'helix-auth-svc/lib/container.js'
import * as server from 'helix-auth-svc/lib/server.js'

const logger = container.resolve('logger')
const findRequest = container.resolve('findRequest')
const receiveUserProfile = container.resolve('receiveUserProfile')
const settings = container.resolve('settingsRepository')
const serviceURI = server.getServiceURI(settings)

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
let previousIssuer

function loadStrategy () {
  return new Promise((resolve, reject) => {
    // reload only if the issuer has been changed since the last time
    if (process.env.OIDC_ISSUER_URI !== previousIssuer) {
      Issuer.discover(process.env.OIDC_ISSUER_URI).then((issuer) => {
        logger.debug('oidc: issuer: %o', issuer.issuer)
        logger.debug('oidc: metadata: %o', issuer.metadata)
        //
        // As a "web application" in which the client secret is hidden from the
        // user, we will choose the more secure Authorization Code Flow over the
        // previously recommended Implicit Grant Flow. Additionally, we will
        // choose to enable Proof Key for Code Exchange (PKCE) where possible.
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
        // if that all worked, then remember the URI to avoid doing it again
        previousIssuer = process.env.OIDC_ISSUER_URI
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

function diagnose () {
  if (process.env.OIDC_CLIENT_SECRET_FILE) {
    if (!fs.existsSync(process.env.OIDC_CLIENT_SECRET_FILE)) {
      logger.error('oidc: client secret file is missing: %s', process.env.OIDC_CLIENT_SECRET_FILE)
    }
  }
}

passport.serializeUser((user, done) => {
  done(null, user)
})

passport.deserializeUser((obj, done) => {
  done(null, obj)
})

if (typeof process.env.OIDC_ISSUER_URI === 'undefined') {
  logger.info('oidc: OIDC not configured, protocol not available')
}
const router = express.Router()
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
    logger.error('oidc: initialization failed: %s', err)
    diagnose()
    res.render('no_strategy')
  })
}

router.get('/login/:id', (req, res, next) => {
  // save the request identifier for request/user mapping
  req.session.requestId = req.params.id
  // set up code verifier for generating secure dynamic keys
  req.session.code_verifier = generators.codeVerifier()
  // helpful for debugging secure cookie issues when running behind a proxy
  // c.f. http://expressjs.com/en/guide/behind-proxies.html
  if (process.env.DEBUG_PROXY) {
    logger.debug('oidc: login request headers: %o', req.headers)
    logger.debug('oidc: login request protocol: %s', req.protocol)
    logger.debug('oidc: login request remote address: %s', req.socket.remoteAddress)
  }
  next()
}, checkStrategy, async (req, res, next) => {
  const code_challenge = generators.codeChallenge(req.session.code_verifier)
  const opts = {
    successReturnToOrRedirect: '/',
    scope: 'openid profile email',
    code_challenge,
    // the generated code is always S256
    code_challenge_method: 'S256'
  }
  const request = await findRequest(req.session.requestId)
  if (request && request.forceAuthn) {
    logger.debug('oidc: forcing authentication using max_age=0')
    opts.max_age = 0
  }
  passport.authenticate('openidconnect', opts)(req, res, next)
})

// PingOne uses GET for the redirect URI
router.get('/callback', checkStrategy, passport.authenticate('openidconnect', {
  callback: true,
  successReturnToOrRedirect: '/oidc/success',
  failureRedirect: '/oidc/login_failed'
}))

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
router.get('/success', checkAuthentication, async (req, res, next) => {
  logger.debug('oidc: /success, requestId: %s, sessionId: %s', req.session.requestId, req.sessionID)
  if (req.session.successRedirect) {
    res.redirect(req.session.successRedirect)
  } else {
    const request = await findRequest(req.session.requestId)
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
      logger.warning('oidc: session/cookie missing request identifier')
      res.redirect('/')
    }
  }
})

router.get('/logout', checkAuthentication, (req, res) => {
  req.logout()
  const url = client
    ? client.endSessionUrl({
        // need the token for the logout redirect to be honored
        id_token_hint: req.session.idToken
      })
    : null
  req.session.destroy()
  if (url) {
    logger.debug('oidc: no user for which to logout')
    res.redirect(url)
  } else {
    res.render('logout_success')
  }
})

export default router
