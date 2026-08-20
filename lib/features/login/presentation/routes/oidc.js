//
// Copyright 2024 Perforce Software
//
import express from 'express'
import * as jose from 'jose'
import passport from 'passport'
import { custom, Issuer, Strategy } from 'openid-client'
import { ProxyAgent } from 'proxy-agent';
import container from 'helix-auth-svc/lib/container.js'
import * as server from 'helix-auth-svc/lib/server.js'

const logger = container.resolve('logger')
const settings = container.resolve('settingsRepository')

// The correct proxy `Agent` implementation to use will be determined via the
// `http_proxy` / `https_proxy` / `no_proxy` / etc. env vars
const agent = new ProxyAgent();
custom.setHttpOptionsDefaults({
  // default timeout of 2500 is too short for some networks
  timeout: 15000,
  // allow admin to configure outbound http(s) proxy via environment variables
  // and the proxy-agent module
  agent: agent
})

async function buildStrategy(providerId, sessionKey) {
  const provider = await findProvider(providerId)
  if (!provider) {
    throw new Error('no oidc provider found')
  }
  const serviceURI = server.getServiceURI(settings)
  const issuer = await Issuer.discover(provider.issuerUri)
  //
  // As a "web application" in which the client secret is hidden from the
  // user, we will choose the more secure Authorization Code Flow over the
  // previously recommended Implicit Grant Flow. Additionally, we will
  // choose to enable Proof Key for Code Exchange (PKCE) where possible.
  //
  const metadata = {
    client_id: provider.clientId,
    client_secret: provider.clientSecret,
    redirect_uris: [serviceURI + '/oidc/callback'],
    response_types: ['code'],
    post_logout_redirect_uris: [serviceURI],
    id_token_signed_response_alg: provider.signingAlgo || 'RS256'
  }
  let jwks
  if (provider.clientKey) {
    // If using public/private key signing of the request, the client_secret
    // value will be ignored (and should not be defined in the configuration).
    metadata.token_endpoint_auth_method = 'private_key_jwt'
    metadata.token_endpoint_auth_signing_alg = 'RS256'
    const privateKey = await jose.importPKCS8(provider.clientKey, 'RS256')
    const jwk = await jose.exportJWK(privateKey)
    jwk.kid = await jose.calculateJwkThumbprint(jwk)
    jwks = {keys: [jwk]}
  }
  const client = new issuer.Client(metadata, jwks)
  const strategy = new Strategy({
    client,
    passReqToCallback: true,
    usePKCE: provider.codeChallenge || true,
    // Without this, openid-client stores its own internal state/nonce/PKCE
    // verifier in req.session under a name fixed per issuer, which collides
    // across concurrent logins sharing one browser session. Deriving it from
    // the request id gives each concurrent login its own slot (HAS-703).
    sessionKey,
    //
    // Azure wants the x5t value in the JWT header but that requires hacking the
    // node-openid-client library in lib/helpers/client.js at line 72; see issue
    // https://github.com/panva/node-openid-client/issues/667
    //
    // Azure needs to have a single audience value to avoid confusion, but this
    // does not work with Okta.
    //
    // extras: {
    //   clientAssertionPayload: {
    //     aud: provider.issuerUri,
    //   },
    // }
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

const router = express.Router()
router.use(passport.initialize())
router.use(passport.session())
passport.serializeUser((user, done) => done(null, user))
passport.deserializeUser((obj, done) => done(null, obj))

// Pending per-request strategy cleanup timers, keyed by request id, so a
// second registration for the same id (e.g. a browser refresh mid-login)
// replaces rather than races the first -- otherwise the first timer could
// later unuse() the second, still-active strategy out from under an
// in-progress login (HAS-703).
const strategyCleanupTimers = new Map()

function scheduleStrategyCleanup(requestId) {
  const existing = strategyCleanupTimers.get(requestId)
  if (existing) {
    clearTimeout(existing)
  }
  const cacheTtl = settings.getInt('CACHE_TTL') * 1000
  const timer = setTimeout(() => {
    passport.unuse(requestId)
    strategyCleanupTimers.delete(requestId)
  }, cacheTtl)
  timer.unref()
  strategyCleanupTimers.set(requestId, timer)
}

function cleanupStrategy(requestId) {
  passport.unuse(requestId)
  const existing = strategyCleanupTimers.get(requestId)
  if (existing) {
    clearTimeout(existing)
    strategyCleanupTimers.delete(requestId)
  }
}

function registerStrategy(req, res, next) {
  // log the session identifier to help with cookie debugging
  logger.debug('oidc: requestId: %s, sessionId: %s', req.requestId, req.sessionID)
  // save the provider id, request-scoped rather than in session, since a
  // second concurrent login sharing the same browser session would clobber
  // a session-stored value before this one reaches /callback (HAS-703)
  req.providerId = req.query.providerId || 'openidconnect'
  // also stash it in session, needed only to survive the POST /authorize
  // round trip of the optional PROMPT_FOR_AUTHORIZATION consent page, the
  // same narrow collision window called out in /login/:id above
  req.session.providerId = req.providerId
  // req.requestId (the :id path param) is used below as a passport strategy
  // name/object key -- reject anything that was not actually issued via
  // /requests/new before it ever reaches passport.use(), both to stop
  // meaningless discovery/build work for made-up ids and, critically, to
  // block an unauthenticated caller from choosing a dangerous key such as
  // "__proto__" or "constructor", which would otherwise pollute the (plain
  // object) strategy map for the whole process (HAS-703)
  const findRequest = container.resolve('findRequest')
  findRequest(req.requestId).then((request) => {
    if (!request) {
      logger.error('oidc: no pending request found for id %s', req.requestId)
      res.render('no_strategy')
      return
    }
    // Register a strategy instance unique to this login attempt (by request id)
    // rather than by provider name, so concurrent logins -- even to the same
    // provider -- never share a passport strategy registration or session key.
    return buildStrategy(req.providerId, req.requestId).then((strategy) => {
      passport.use(req.requestId, strategy)
      next()
    })
  }).catch((err) => {
    logger.error('oidc: initialization failed: %s', err)
    logger.error('oidc: maybe client secret file is missing')
    res.render('no_strategy')
  })
}

async function getSelectAccount(providerId) {
  const provider = await findProvider(providerId)
  if (provider) {
    return provider.selectAccount
  }
  return false
}

async function findProvider(providerId) {
  const getAuthProviders = container.resolve('getAuthProviders')
  const providers = await getAuthProviders()
  if (providerId === 'openidconnect') {
    // assume there is just one oidc provider and find it
    return providers.find((e) => e.protocol === 'oidc')
  } else {
    return providers.find((e) => e.id === providerId)
  }
}

function ensureAuthorized(req, res, next) {
  if (settings.has('PROMPT_FOR_AUTHORIZATION')) {
    const authorizeUrl = `/oidc/authorize?rid=${req.session.requestId}`
    res.render('authorize', { authorizeUrl })
  } else {
    next()
  }
}

router.post('/authorize', (req, res, next) => {
  if (req.query.rid === req.session.requestId) {
    // this request has no /login/:id middleware to set these, so recover
    // them from session (the narrow PROMPT_FOR_AUTHORIZATION collision
    // window called out above, HAS-703)
    req.requestId = req.session.requestId
    req.providerId = req.session.providerId
    next()
  } else {
    res.render('error', {
      message: 'Authorization Failed',
      details: 'The request to approve a login has failed.'
    })
  }
}, performAuthentication)

router.get('/login/:id', (req, res, next) => {
  // request-scoped id used for the primary correlation mechanism below; kept
  // separate from the shared session (HAS-703)
  req.requestId = req.params.id
  // retained only for the optional PROMPT_FOR_AUTHORIZATION consent-page
  // round trip, a narrower, separate collision window not addressed here
  req.session.requestId = req.params.id
  req.session.showProfileData = req.query.test ? true : false
  // helpful for debugging secure cookie issues when running behind a proxy
  // c.f. http://expressjs.com/en/guide/behind-proxies.html
  if (settings.has('DEBUG_PROXY')) {
    logger.debug('oidc: login request headers: %o', req.headers)
    logger.debug('oidc: login request protocol: %s', req.protocol)
    logger.debug('oidc: login request remote address: %s', req.socket.remoteAddress)
  }
  next()
}, registerStrategy, ensureAuthorized, performAuthentication)

async function performAuthentication(req, res, next) {
  const select_account = await getSelectAccount(req.providerId)
  const opts = {
    keepSessionInfo: true,
    successReturnToOrRedirect: '/',
    scope: 'openid profile email',
    // Carry our own request id through the OAuth2 state parameter so the
    // callback can recover it (and which strategy instance to reuse) without
    // depending on the shared browser session, which a second concurrent
    // login would clobber (HAS-703). PKCE code_challenge/code_verifier are
    // handled entirely internally by openid-client's Strategy -- it ignores
    // and overwrites any code_challenge passed in here, so there is no need
    // (and no effect) to compute one manually.
    state: req.requestId,
    // undocumented prompt support in openid-client
    prompt: select_account ? 'select_account' : undefined
  }
  const findRequest = container.resolve('findRequest')
  const request = await findRequest(req.requestId)
  if (request && request.forceAuthn) {
    // request parameter forceAuthn takes precedence over provider property
    logger.debug('oidc: forcing authentication using max_age=0')
    opts.max_age = 0
  } else {
    // otherwise, if the provider has a maxAge property, use that as-is
    const provider = await findProvider(req.providerId)
    if (provider && 'maxAge' in provider) {
      const maxAge = parseInt(provider.maxAge, 10)
      logger.debug(`oidc: restricting session lifetime with max_age=${maxAge}`)
      opts.max_age = maxAge
    }
  }
  // /success and /login_failed clean this up in the normal case, but if the
  // browser never completes the round trip (closed tab, network drop) nothing
  // else would remove this registration; bound its lifetime instead of
  // letting passport's strategy map grow without limit (HAS-703). Scheduled
  // here rather than in registerStrategy so the optional
  // PROMPT_FOR_AUTHORIZATION consent-page detour -- which can add an
  // arbitrarily long, human-paced delay before this point -- doesn't eat
  // into the same budget as the actual timed round trip to the IdP.
  scheduleStrategyCleanup(req.requestId)
  passport.authenticate(req.requestId, opts)(req, res, next)
}

function ensureStrategized(req, res, next) {
  // Recover our request id from the OAuth2 state parameter that the IdP
  // echoes back on the callback, rather than from the shared browser
  // session, which a second concurrent login would have overwritten by now
  // (HAS-703).
  const requestId = req.query.state || req.body.state
  if (!requestId) {
    logger.error('oidc: no state parameter on callback')
    res.redirect('/')
    return
  }
  // Validate against findRequest() rather than just probing
  // passport._strategy(), which reads from a plain object and would return a
  // false positive (an inherited Object.prototype member, e.g. 'constructor'
  // or 'toString') for a name that was never actually registered (HAS-703).
  const findRequest = container.resolve('findRequest')
  findRequest(requestId).then((request) => {
    if (request && passport._strategy(requestId)) {
      req.requestId = requestId
      next()
    } else {
      logger.error('oidc: no matching login request found for callback (state: %s)', requestId)
      res.redirect('/')
    }
  }).catch((err) => {
    logger.error('oidc: error validating callback request: %s', err)
    res.redirect('/')
  })
}

function handleCallback(req, res, next) {
  const opts = {
    keepSessionInfo: true,
    callback: true,
    successReturnToOrRedirect: `/oidc/success?rid=${req.requestId}`,
    failureRedirect: `/oidc/login_failed?rid=${req.requestId}`
  }
  passport.authenticate(req.requestId, opts)(req, res, next)
}

// some services use GET and some use POST
router.get('/callback', ensureStrategized, handleCallback)
router.post('/callback', ensureStrategized, handleCallback)

// eslint-disable-next-line no-unused-vars
router.get('/login_failed', (req, res, next) => {
  // we need a route that is not the login route lest we end up
  // in a redirect loop when a failure occurs
  if (req.query.rid) {
    // clean up the per-request strategy registration (HAS-703)
    cleanupStrategy(req.query.rid)
  }
  res.render('login_failed')
})

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    next()
  } else {
    logger.debug('oidc: session not authenticated')
    res.redirect('/')
  }
}

// eslint-disable-next-line no-unused-vars
router.get('/success', ensureAuthenticated, async (req, res, next) => {
  // Prefer the request id carried through the OAuth2 state param (HAS-703);
  // fall back to the session value for the PROMPT_FOR_AUTHORIZATION path and
  // any other caller that only ever set the session.
  const requestId = req.query.rid || req.session.requestId
  logger.debug('oidc: /success, requestId: %s, sessionId: %s', requestId, req.sessionID)
  // the per-login-attempt strategy registration is no longer needed once the
  // callback has been handled, successfully or not (HAS-703)
  if (req.query.rid) {
    cleanupStrategy(req.query.rid)
  }
  if (req.session.successRedirect) {
    // Special case of service acting as SAML IdP for another application with
    // login handled by OIDC, which means logout must be handled via OIDC.
    req.session.logoutRedirect = '/oidc/logout'
    res.redirect(req.session.successRedirect)
  } else {
    const findRequest = container.resolve('findRequest')
    const request = await findRequest(requestId)
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
