//
// Copyright 2020-2022 Perforce Software
//
import * as fs from 'node:fs'
import * as afs from 'node:fs/promises'
import express from 'express'
import passport from 'passport'
import { custom, generators, Issuer, Strategy } from 'openid-client'
import container from 'helix-auth-svc/lib/container.js'
import * as server from 'helix-auth-svc/lib/server.js'

const logger = container.resolve('logger')
const settings = container.resolve('settingsRepository')

custom.setHttpOptionsDefaults({
  // default timeout of 2500ms is just a little too short some times
  timeout: 5000
})

async function buildStrategyFromParts ({
  issuerUri, clientId, clientSecret, signingAlgo, codeChallenge
}) {
  const serviceURI = server.getServiceURI(settings)
  const issuer = await Issuer.discover(issuerUri)
  //
  // As a "web application" in which the client secret is hidden from the
  // user, we will choose the more secure Authorization Code Flow over the
  // previously recommended Implicit Grant Flow. Additionally, we will
  // choose to enable Proof Key for Code Exchange (PKCE) where possible.
  //
  const client = new issuer.Client({
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uris: [serviceURI + '/oidc/callback'],
    response_types: ['code'],
    post_logout_redirect_uris: [serviceURI],
    id_token_signed_response_alg: signingAlgo || 'RS256'
  })
  const strategy = new Strategy({
    client,
    passReqToCallback: true,
    usePKCE: codeChallenge || true
  }, (req, tokenset, userinfo, done) => {
    // the end_session_endpoint property is required for logout support
    if (issuer.end_session_endpoint) {
      req.session.endSessionUrl = client.endSessionUrl({
        // need the token for the logout redirect to be honored
        id_token_hint: tokenset.id_token
      })
    }
    done(null, userinfo)
  })
  return strategy
}

async function buildStrategy (providerId) {
  if (providerId) {
    const getAuthProviders = container.resolve('getAuthProviders')
    const providers = await getAuthProviders()
    const provider = providers.find((e) => e.id === providerId)
    if (provider) {
      return buildStrategyFromParts(provider)
    }
  }
  let clientSecret = settings.get('OIDC_CLIENT_SECRET')
  const secretFile = settings.get('OIDC_CLIENT_SECRET_FILE')
  if (secretFile) {
    const rawSecret = await afs.readFile(secretFile, 'utf8')
    clientSecret = rawSecret.trim()
  }
  const providerLike = {
    issuerUri: settings.get('OIDC_ISSUER_URI'),
    clientId: settings.get('OIDC_CLIENT_ID'),
    clientSecret,
    signingAlgo: settings.get('OIDC_TOKEN_SIGNING_ALGO'),
    codeChallenge: settings.get('OIDC_CODE_CHALLENGE_METHOD')
  }
  return buildStrategyFromParts(providerLike)
}

const router = express.Router()
router.use(passport.initialize())
router.use(passport.session())
passport.serializeUser((user, done) => done(null, user))
passport.deserializeUser((obj, done) => done(null, obj))

function registerStrategy (req, res, next) {
  // log the session identifier to help with cookie debugging
  logger.debug('oidc: requestId: %s, sessionId: %s', req.session.requestId, req.sessionID)
  // save the name of the passport strategy for callback routes
  if (req.query.provider) {
    req.session.strategy = req.query.provider
  } else {
    req.session.strategy = 'openidconnect'
  }
  // construct the strategy every time using latest settings
  buildStrategy(req.query.provider).then((strategy) => {
    passport.use(req.session.strategy, strategy)
    // Note the undoc passport.unuse(<name>) exists and can be used to clean up
    // the registered passport stratgies, if that is at all helpful.
    next()
  }).catch((err) => {
    logger.error('oidc: initialization failed: %s', err)
    const secretFile = settings.get('OIDC_CLIENT_SECRET_FILE')
    if (secretFile) {
      if (!fs.existsSync(secretFile)) {
        logger.error('oidc: client secret file is missing: %s', secretFile)
      }
    }
    res.render('no_strategy')
  })
}

async function getSelectAccount (req) {
  const providerId = req.session.strategy
  if (providerId === 'openidconnect') {
    return settings.getBool('OIDC_SELECT_ACCOUNT')
  } else {
    const getAuthProviders = container.resolve('getAuthProviders')
    const providers = await getAuthProviders()
    const provider = providers.find((e) => e.id === providerId)
    if (provider) {
      return provider.selectAccount
    }
  }
  return false
}

router.get('/login/:id', (req, res, next) => {
  // save the request identifier for request/user mapping
  req.session.requestId = req.params.id
  // set up code verifier for generating secure dynamic keys
  req.session.code_verifier = generators.codeVerifier()
  req.session.showProfileData = req.query.test ? true : false
  // helpful for debugging secure cookie issues when running behind a proxy
  // c.f. http://expressjs.com/en/guide/behind-proxies.html
  if (settings.has('DEBUG_PROXY')) {
    logger.debug('oidc: login request headers: %o', req.headers)
    logger.debug('oidc: login request protocol: %s', req.protocol)
    logger.debug('oidc: login request remote address: %s', req.socket.remoteAddress)
  }
  next()
}, registerStrategy, async (req, res, next) => {
  const select_account = await getSelectAccount(req)
  const code_challenge = generators.codeChallenge(req.session.code_verifier)
  const opts = {
    keepSessionInfo: true,
    successReturnToOrRedirect: '/',
    scope: 'openid profile email',
    code_challenge,
    // the generated code is always S256
    code_challenge_method: 'S256',
    // undocumented prompt support in openid-client
    prompt: select_account ? 'select_account' : undefined
  }
  const findRequest = container.resolve('findRequest')
  const request = await findRequest(req.session.requestId)
  if (request && request.forceAuthn) {
    logger.debug('oidc: forcing authentication using max_age=0')
    opts.max_age = 0
  }
  passport.authenticate(req.session.strategy, opts)(req, res, next)
})

function ensureStrategized (req, res, next) {
  if (req.session.strategy) {
    next()
  } else {
    logger.error('oidc: passport strategy not found in session ')
    res.redirect('/')
  }
}

function handleCallback (req, res, next) {
  const opts = {
    keepSessionInfo: true,
    callback: true,
    successReturnToOrRedirect: '/oidc/success',
    failureRedirect: '/oidc/login_failed'
  }
  passport.authenticate(req.session.strategy, opts)(req, res, next)
}

// some services use GET and some use POST
router.get('/callback', ensureStrategized, handleCallback)
router.post('/callback', ensureStrategized, handleCallback)

// eslint-disable-next-line no-unused-vars
router.get('/login_failed', (req, res, next) => {
  // we need a route that is not the login route lest we end up
  // in a redirect loop when a failure occurs
  res.render('login_failed')
})

function ensureAuthenticated (req, res, next) {
  if (req.isAuthenticated()) {
    next()
  } else {
    logger.debug('oidc: session not authenticated')
    res.redirect('/')
  }
}

// eslint-disable-next-line no-unused-vars
router.get('/success', ensureAuthenticated, async (req, res, next) => {
  logger.debug('oidc: /success, requestId: %s, sessionId: %s', req.session.requestId, req.sessionID)
  if (req.session.successRedirect) {
    // Special case of service acting as SAML IdP for another application with
    // login handled by OIDC, which means logout must be handled via OIDC.
    req.session.logoutRedirect = '/oidc/logout'
    res.redirect(req.session.successRedirect)
  } else {
    const findRequest = container.resolve('findRequest')
    const request = await findRequest(req.session.requestId)
    if (request) {
      // clear the request identifier from the user session
      delete req.session.requestId
      logger.debug('oidc: mapping %s to result %o', request.id, req.user)
      const receiveUserProfile = container.resolve('receiveUserProfile')
      receiveUserProfile(request.id, request.userId, req.user)
      const name = req.user.given_name || req.user.name || req.user.email
      const details = { name, profile: false }
      if (req.session.showProfileData) {
        details.profile = JSON.stringify(req.user, null, 2)
      }
      res.render('details', details)
    } else {
      // Cookies were lost during the login process, either because the browser
      // does not like the security settings, or the load balancer does not have
      // sticky sessions enabled.
      logger.warning('oidc: session/cookie missing request identifier')
      const name = req.user.given_name || req.user.name || req.user.email
      res.render('no_session', { name })
    }
  }
})

router.get('/logout', ensureAuthenticated, (req, res, next) => {
  delete req.session.logoutRedirect
  const endSessionUrl = req.session.endSessionUrl
  req.logout(function (err) {
    if (err) {
      return next(err)
    }
    req.session.destroy()
    if (endSessionUrl) {
      res.redirect(endSessionUrl)
    } else {
      res.render('logout_success')
    }
  })
})

export default router
