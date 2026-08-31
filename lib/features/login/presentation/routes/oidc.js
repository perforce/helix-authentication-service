//
// Copyright 2024 Perforce Software
//
import express from 'express'
import * as jose from 'jose'
import passport from 'passport'
import * as client from 'openid-client'
import container from 'helix-auth-svc/lib/container.js'
import * as server from 'helix-auth-svc/lib/server.js'
import { oidcFetch } from 'helix-auth-svc/lib/features/login/data/connectors/OidcFetch.js'

const logger = container.resolve('logger')
const settings = container.resolve('settingsRepository')

async function buildConfig(provider) {
  //
  // As a "web application" in which the client secret is hidden from the
  // user, we will choose the more secure Authorization Code Flow over the
  // previously recommended Implicit Grant Flow. Additionally, PKCE is always
  // enabled (see performAuthentication()).
  //
  const metadata = {
    id_token_signed_response_alg: provider.signingAlgo || 'RS256'
  }
  let clientAuthentication
  if (provider.clientKey) {
    // If using public/private key signing of the request, the client_secret
    // value will be ignored (and should not be defined in the configuration).
    const privateKey = await jose.importPKCS8(provider.clientKey, 'RS256')
    clientAuthentication = client.PrivateKeyJwt(privateKey)
    //
    // Azure wants the x5t value in the JWT header; openid-client v6 supports
    // customizing the assertion via a ModifyAssertionOptions argument to
    // PrivateKeyJwt(), e.g. PrivateKeyJwt(privateKey, { [client.modifyAssertion]:
    // (header) => { header.x5t = ... } }), once a client certificate (not just
    // a private key) is available to compute the thumbprint from. See
    // https://github.com/panva/openid-client/discussions/668
    //
    // Azure also needs a single audience value to avoid confusion, but this
    // does not work with Okta.
    //
  } else {
    // matches openid-client v5's default token_endpoint_auth_method
    clientAuthentication = client.ClientSecretBasic(provider.clientSecret)
  }
  return client.discovery(
    new URL(provider.issuerUri),
    provider.clientId,
    metadata,
    clientAuthentication,
    { [client.customFetch]: oidcFetch }
  )
}

const router = express.Router()
router.use(passport.initialize())
router.use(passport.session())
passport.serializeUser((user, done) => done(null, user))
passport.deserializeUser((obj, done) => done(null, obj))

// Pending logins, keyed by request id, holding everything needed to complete
// the authorization code exchange when the callback arrives -- replaces the
// v5 approach of registering a per-request-id passport Strategy instance
// (HAS-703). A real Map is used rather than a plain object so an
// attacker-chosen request id such as "__proto__" or "constructor" cannot
// pollute the registry (HAS-703).
const pendingLogins = new Map()

// Pending per-request cleanup timers, keyed by request id, so a second
// registration for the same id (e.g. a browser refresh mid-login) replaces
// rather than races the first -- otherwise the first timer could later delete
// the second, still-active login out from under an in-progress attempt
// (HAS-703).
const cleanupTimers = new Map()

function scheduleCleanup(requestId) {
  const existing = cleanupTimers.get(requestId)
  if (existing) {
    clearTimeout(existing)
  }
  const cacheTtl = settings.getInt('CACHE_TTL') * 1000
  const timer = setTimeout(() => {
    pendingLogins.delete(requestId)
    cleanupTimers.delete(requestId)
  }, cacheTtl)
  timer.unref()
  cleanupTimers.set(requestId, timer)
}

function cleanupLogin(requestId) {
  pendingLogins.delete(requestId)
  const existing = cleanupTimers.get(requestId)
  if (existing) {
    clearTimeout(existing)
    cleanupTimers.delete(requestId)
  }
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

function prepareLogin(req, res, next) {
  // log the session identifier to help with cookie debugging
  logger.debug('oidc: requestId: %s, sessionId: %s', req.requestId, req.sessionID)
  // save the provider id, request-scoped rather than in session, since a
  // second concurrent login sharing the same browser session would clobber
  // a session-stored value before this one reaches /callback (HAS-703)
  const providerId = req.query.providerId || 'openidconnect'
  // also stash it in session, needed only to survive the POST /authorize
  // round trip of the optional PROMPT_FOR_AUTHORIZATION consent page, the
  // same narrow collision window called out in /login/:id above
  req.session.providerId = providerId
  // req.requestId (the :id path param) is used below as the pending-login map
  // key -- reject anything that was not actually issued via /requests/new
  // before it ever reaches pendingLogins, both to stop meaningless discovery
  // work for made-up ids and, critically, to block an unauthenticated caller
  // from choosing a dangerous key such as "__proto__" or "constructor" (a Map
  // is immune to this regardless, but the findRequest() check also guards
  // against wasted discovery/build work for ids that were never issued) (HAS-703)
  const findRequest = container.resolve('findRequest')
  findRequest(req.requestId).then((request) => {
    if (!request) {
      logger.error('oidc: no pending request found for id %s', req.requestId)
      res.render('no_strategy')
      return
    }
    return findProvider(providerId).then((provider) => {
      if (!provider) {
        throw new Error('no oidc provider found')
      }
      // Register the pending login unique to this login attempt (by request
      // id) rather than by provider name, so concurrent logins -- even to the
      // same provider -- never share state.
      return buildConfig(provider).then((config) => {
        pendingLogins.set(req.requestId, { config, provider })
        next()
      })
    })
  }).catch((err) => {
    logger.error('oidc: initialization failed: %s', err)
    logger.error('oidc: maybe client secret file is missing')
    res.render('no_strategy')
  })
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
    // the request id from session (the narrow PROMPT_FOR_AUTHORIZATION
    // collision window called out above, HAS-703)
    req.requestId = req.session.requestId
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
}, prepareLogin, ensureAuthorized, performAuthentication)

async function performAuthentication(req, res) {
  const pending = pendingLogins.get(req.requestId)
  if (!pending) {
    // only reachable if the cleanup timer fired between prepareLogin and here,
    // e.g. an abandoned PROMPT_FOR_AUTHORIZATION consent page
    logger.error('oidc: no pending login found for id %s', req.requestId)
    res.render('no_strategy')
    return
  }
  const { config, provider } = pending
  const serviceURI = server.getServiceURI(settings)
  const codeVerifier = client.randomPKCECodeVerifier()
  const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier)
  // stash the verifier for the token exchange in handleCallback()
  pending.codeVerifier = codeVerifier
  const params = {
    redirect_uri: serviceURI + '/oidc/callback',
    scope: 'openid profile email',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    // Carry our own request id through the OAuth2 state parameter so the
    // callback can recover it (and which pending login to use) without
    // depending on the shared browser session, which a second concurrent
    // login would clobber (HAS-703).
    state: req.requestId
  }
  if (provider.selectAccount) {
    // undocumented prompt support in openid-client
    params.prompt = 'select_account'
  }
  const findRequest = container.resolve('findRequest')
  const request = await findRequest(req.requestId)
  if (request && request.forceAuthn) {
    // request parameter forceAuthn takes precedence over provider property
    logger.debug('oidc: forcing authentication using max_age=0')
    params.max_age = '0'
  } else if (provider && 'maxAge' in provider) {
    // otherwise, if the provider has a maxAge property, use that as-is
    const maxAge = parseInt(provider.maxAge, 10)
    logger.debug(`oidc: restricting session lifetime with max_age=${maxAge}`)
    params.max_age = String(maxAge)
  }
  // /success and /login_failed clean this up in the normal case, but if the
  // browser never completes the round trip (closed tab, network drop) nothing
  // else would remove this registration; bound its lifetime instead of
  // letting the pending-logins map grow without limit (HAS-703). Scheduled
  // here rather than in prepareLogin so the optional PROMPT_FOR_AUTHORIZATION
  // consent-page detour -- which can add an arbitrarily long, human-paced
  // delay before this point -- doesn't eat into the same budget as the actual
  // timed round trip to the IdP.
  scheduleCleanup(req.requestId)
  const redirectTo = client.buildAuthorizationUrl(config, params)
  res.redirect(redirectTo.href)
}

function ensurePendingLogin(req, res, next) {
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
  // Validate against findRequest() and the pending-logins map rather than
  // just trusting the state value on its own (HAS-703).
  const findRequest = container.resolve('findRequest')
  findRequest(requestId).then((request) => {
    if (request && pendingLogins.has(requestId)) {
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

function currentUrlFromRequest(req) {
  return new URL(`${req.protocol}://${req.get('host')}${req.originalUrl}`)
}

async function handleCallback(req, res, next) {
  const pending = pendingLogins.get(req.requestId)
  if (!pending) {
    logger.error('oidc: no pending login found for callback id %s', req.requestId)
    res.redirect(`/oidc/login_failed?rid=${req.requestId}`)
    return
  }
  const { config, codeVerifier } = pending
  try {
    let input = currentUrlFromRequest(req)
    if (req.method === 'POST') {
      input = new Request(input.href, {
        method: 'POST',
        headers: Object.entries(req.headers).reduce((headers, [key, value]) => {
          for (const v of Array.isArray(value) ? value : [value]) {
            headers.append(key, v)
          }
          return headers
        }, new Headers()),
        body: new URLSearchParams(req.body).toString(),
        duplex: 'half'
      })
    }
    const tokens = await client.authorizationCodeGrant(config, input, {
      pkceCodeVerifier: codeVerifier,
      expectedState: req.requestId
    })
    const claims = tokens.claims()
    const userinfo = await client.fetchUserInfo(config, tokens.access_token, claims.sub)
    // the end_session_endpoint property is required for logout support
    if (config.serverMetadata().end_session_endpoint) {
      req.session.endSessionUrl = client.buildEndSessionUrl(config, {
        // need the token for the logout redirect to be honored
        id_token_hint: tokens.id_token,
        // without this, the IdP has nowhere registered to send the browser
        // back to once its own logout page is done
        post_logout_redirect_uri: server.getServiceURI(settings)
      }).href
    }
    // Without keepSessionInfo, passport's session-fixation protection would
    // regenerate the session on login, silently discarding the endSessionUrl
    // (and any other session state such as requestId/providerId) set above
    // and elsewhere in this flow.
    req.login(userinfo, { keepSessionInfo: true }, (err) => {
      if (err) {
        next(err)
      } else {
        res.redirect(`/oidc/success?rid=${req.requestId}`)
      }
    })
  } catch (err) {
    logger.error('oidc: token exchange failed: %s', err)
    res.redirect(`/oidc/login_failed?rid=${req.requestId}`)
  }
}

// some services use GET and some use POST
router.get('/callback', ensurePendingLogin, handleCallback)
router.post('/callback', ensurePendingLogin, handleCallback)

// eslint-disable-next-line no-unused-vars
router.get('/login_failed', (req, res, next) => {
  // we need a route that is not the login route lest we end up
  // in a redirect loop when a failure occurs
  if (req.query.rid) {
    // clean up the per-request pending login (HAS-703)
    cleanupLogin(req.query.rid)
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
  // the per-login-attempt pending login is no longer needed once the
  // callback has been handled, successfully or not (HAS-703)
  if (req.query.rid) {
    cleanupLogin(req.query.rid)
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
