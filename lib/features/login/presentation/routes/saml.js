//
// Copyright 2020-2021 Perforce Software
//
import * as fs from 'node:fs'
import express from 'express'
import passport from 'passport'
import { MultiSamlStrategy } from 'passport-saml'
import { SAML } from 'node-saml'
import samlp from 'samlp'
import container from 'helix-auth-svc/lib/container.js'
import * as server from 'helix-auth-svc/lib/server.js'
import * as common from 'helix-auth-svc/lib/features/login/presentation/routes/common.js'

const logger = container.resolve('logger')
const assignNameIdentifier = container.resolve('assignNameIdentifier')
const fetchSamlMetadata = container.resolve('fetchSamlMetadata')
const findRequest = container.resolve('findRequest')
const getSamlAuthnContext = container.resolve('getSamlAuthnContext')
const getUserById = container.resolve('getUserById')
const isClientAuthorized = container.resolve('isClientAuthorized')
const receiveUserProfile = container.resolve('receiveUserProfile')
const startRequest = container.resolve('startRequest')
const validateSamlRequest = container.resolve('validateSamlRequest')
const settings = container.resolve('settingsRepository')
const serviceURI = server.getServiceURI(settings)

const idpOptions = {
  cert: fs.readFileSync(container.resolve('serviceCert'), 'utf-8'),
  key: fs.readFileSync(container.resolve('serviceKey'), 'utf-8'),
  issuer: 'urn:auth-service:idp',
  redirectEndpointPath: '/saml/login',
  postEndpointPath: '/saml/login',
  logoutEndpointPaths: {
    redirect: '/saml/logout'
  }
}

// process the authn context once and cache the result
const authnContext = getSamlAuthnContext()
if (authnContext) {
  logger.debug('saml: authn context: %o', authnContext)
}

function loadSamlOptions () {
  const samlOptions = {
    callbackUrl: serviceURI + '/saml/sso',
    logoutCallbackUrl: serviceURI + '/saml/slo',
    entryPoint: process.env.SAML_IDP_SSO_URL || undefined,
    logoutUrl: process.env.SAML_IDP_SLO_URL || undefined,
    issuer: process.env.SAML_SP_ENTITY_ID || process.env.SAML_SP_ISSUER || 'https://has.example.com',
    idpIssuer: process.env.SAML_IDP_ENTITY_ID || process.env.SAML_IDP_ISSUER || undefined,
    audience: process.env.SAML_SP_AUDIENCE || undefined,
    authnContext,
    disableRequestedAuthnContext: process.env.SAML_DISABLE_CONTEXT || undefined,
    decryptionPvk: fs.readFileSync(container.resolve('serviceKey'), 'utf-8'),
    privateKey: fs.readFileSync(container.resolve('serviceKey'), 'utf-8'),
    signatureAlgorithm: process.env.SP_KEY_ALGO || 'sha256',
    identifierFormat: process.env.SAML_NAMEID_FORMAT || 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified'
  }
  if (process.env.IDP_CERT_FILE) {
    // cannot specify an undefined 'cert' so must do this conditionally
    samlOptions.cert = readIdentityCert(process.env.IDP_CERT_FILE)
  }
  return samlOptions
}

// Use multi-strategy to enable us to dynamically configure the SAML options.
const strategy = new MultiSamlStrategy(
  {
    getSamlOptions: (req, done) => {
      findRequest(req.session.requestId || 'none').then((request) => {
        // determine if we should force authentication
        const force = (request && request.forceAuthn) || false
        logger.debug('saml: forceAuthn set to %s', force)
        const options = Object.assign({}, loadSamlOptions(), { forceAuthn: force })
        fetchSamlMetadata(options).then((config) => {
          if (process.env.DEBUG_SAML) {
            logger.debug('saml: passport SAML configuration: %o', scrubConfiguration(config))
          }
          // Convert the certificate to a single line, as node-saml expects.
          if (Array.isArray(config.cert)) {
            config.cert = config.cert.map((e) => massageCertificate(e))
          } else if (typeof config.cert === 'string') {
            config.cert = massageCertificate(config.cert)
          }
          return done(null, config)
        }).catch((err) => {
          logger.error('saml: unable to fetch IdP configuration: %s', err)
          // Avoid circular dependencies between SP and IdP and return whatever
          // we have that the IdP might need so it can configure itself and
          // return the results back to us.
          return done(null, options)
        })
      })
    }
  }, (profile, done) => {
    return done(null, extractProfile(profile))
  }
)
if (!common.isSamlConfigured(settings)) {
  logger.info('saml: SAML not configured, protocol not available')
}
const router = express.Router()
router.use(passport.initialize())
router.use(passport.session())

passport.serializeUser((user, done) => {
  // serialize the entire object as-is
  done(null, user)
})

passport.deserializeUser((user, done) => {
  done(null, user)
})

function checkStrategy (req, res, next) {
  // log the session identifier to help with cookie debugging
  logger.debug('saml: requestId: %s, sessionId: %s', req.session.requestId, req.sessionID)
  if (common.isSamlConfigured(settings)) {
    passport.use(strategy)
  }
  if (passport._strategy('saml')) {
    next()
  } else {
    res.render('no_strategy')
  }
}

router.get('/metadata', (req, res) => {
  fs.readFile(container.resolve('serviceCert'), 'utf-8', (err, data) => {
    if (err) {
      res.render('error', {
        message: 'service cert read error: ' + err.message,
        error: err
      })
    } else if (data) {
      strategy.generateServiceProviderMetadata(req, data, data, (err, data) => {
        if (err) {
          res.render('error', {
            message: 'SAML metadata generation error: ' + err.message,
            error: err
          })
        } else if (data) {
          res.header('Content-Type', 'text/xml').send(data)
        }
      })
    }
  })
})

router.get('/idp/metadata', samlp.metadata(idpOptions))

router.get('/login/:id', (req, res, next) => {
  // save the request identifier for request/user mapping
  req.session.requestId = req.params.id
  // helpful for debugging secure cookie issues when running behind a proxy
  // c.f. http://expressjs.com/en/guide/behind-proxies.html
  if (process.env.DEBUG_PROXY) {
    logger.debug('saml: login request headers: %o', req.headers)
    logger.debug('saml: login request protocol: %s', req.protocol)
    logger.debug('saml: login request remote address: %s', req.socket.remoteAddress)
  }
  next()
}, checkStrategy, passport.authenticate('saml', {
  failureRedirect: '/saml/login_failed'
}))

// eslint-disable-next-line no-unused-vars
router.get('/login', (req, res, next) => {
  // Backward-compatible API for 1-step SAML behavior, in which the request does
  // not have a user identifier associated with a request identifier.
  samlp.parseRequest(req, (err, data) => {
    if (err) {
      res.render('error', {
        message: 'SAML AuthnRequest parse error: ' + err.message,
        error: err
      })
    } else if (data) {
      if (process.env.DEBUG_SAML) {
        logger.debug('saml: parsed request: %o', data)
      }
      const forceAuthn = data.forceAuthn === 'true'
      req.session.authnRequest = {
        relayState: req.query.RelayState,
        id: data.id,
        issuer: data.issuer,
        destination: data.destination,
        acsUrl: data.assertionConsumerServiceURL,
        forceAuthn,
        context: data.requestedAuthnContext
      }
      // Use the client-generated request identifier as the "userId" so we can
      // recongize this request later in the success route as being a request
      // coming from another application.
      const request = startRequest(data.id, forceAuthn)
      logger.debug('saml: new request %s for %s', request.id, data.id)
      req.session.successRedirect = '/saml/success'
      // ensure that logout takes the appropriate route later
      const proto = process.env.DEFAULT_PROTOCOL
      if (proto && proto !== 'saml') {
        // only set this if _not_ already using SAML by default
        req.session.logoutRedirect = `/${proto}/logout`
      }
      // now that everything is set up, go through the normal login path
      res.redirect(`/${proto || 'saml'}/login/${request.id}`)
    }
  })
})

router.post('/sso', checkStrategy, passport.authenticate('saml', {
  successRedirect: '/saml/success',
  failureRedirect: '/saml/login_failed'
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
    logger.debug('saml: session not authenticated')
    res.redirect('/')
  }
}

// eslint-disable-next-line no-unused-vars
router.get('/success', checkAuthentication, async (req, res, next) => {
  logger.debug('saml: /success, requestId: %s, sessionId: %s', req.session.requestId, req.sessionID)
  req.session.successRedirect = null
  const request = await findRequest(req.session.requestId)
  if (request) {
    // clear the request identifier from the user session
    req.session.requestId = null
    // Detect if this is a request from another application in which the
    // "userId" is the client-generated request identifier.
    const clientId = req.session.authnRequest ? req.session.authnRequest.id : undefined
    if (request.userId === clientId) {
      // This is the SAML 1-step route, in which we do not have a known user
      // identifier to associate with the request. Default to using the nameID.
      //
      // However, if a different protocol is configured as the default, then we
      // may have to fake the nameID to something, probably the email.
      req.user = assignNameIdentifier(req.user)
      logger.debug('saml: 1-step mapping %s to result %o', req.user.nameID, req.user)
      receiveUserProfile(req.user.nameID, req.user)
      try {
        const result = await validateSamlRequest(
          req.session.authnRequest.issuer,
          req.session.authnRequest.acsUrl
        )
        if (result) {
          // make a user object that samlp will work with
          const user = buildResponseUser(req.user)
          logger.debug('saml: preparing SAML response for %s', req.session.authnRequest.id)
          // Generate a new SAML response befitting of the request we received.
          const moreOptions = Object.assign({}, idpOptions, {
            audience: req.session.authnRequest.issuer,
            destination: req.session.authnRequest.acsUrl,
            recipient: req.session.authnRequest.acsUrl,
            inResponseTo: req.session.authnRequest.id,
            authnContextClassRef: 'urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport',
            sessionIndex: undefined,
            nameIdentifierFormat: req.user.nameIDFormat,
            includeAttributeNameFormat: true
          })
          if (req.session.authnRequest.context && req.session.authnRequest.context.authnContextClassRef) {
            moreOptions.authnContextClassRef = req.session.authnRequest.context.authnContextClassRef
          }
          samlp.getSamlResponse(moreOptions, user, (err, resp) => {
            if (err) {
              res.render('error', {
                message: 'SAML response error: ' + err.message,
                error: err
              })
            } else {
              if (process.env.DEBUG_SAML) {
                // helpful for debugging, but too large to log unconditionally
                logger.debug('saml: full SAML response: %s', resp)
              }
              // render an HTML form to send the response back to the SP
              res.set('Content-Security-Policy', "script-src 'unsafe-inline'")
              res.render('samlresponse', {
                AcsUrl: req.session.authnRequest.acsUrl,
                SAMLResponse: Buffer.from(resp, 'utf-8').toString('base64'),
                RelayState: req.session.authnRequest.relayState
              })
              logger.debug('saml: SAML response rendered for %s', req.session.authnRequest.id)
            }
          })
        } else {
          res.render('error', {
            message: `SAML ACS URL ${req.session.authnRequest.acsUrl} does not match configuration`,
            error: new Error('SAML ACS URL mismatch')
          })
        }
      } catch (err) {
        res.render('error', {
          message: 'SAML response error: ' + err.message,
          error: err
        })
      }
    } else {
      // "normal" success path, save user data for verification
      logger.debug('saml: mapping %s to result %o', request.userId, req.user)
      receiveUserProfile(request.userId, req.user)
      const name = req.user.nameID
      res.render('details', { name })
    }
  } else {
    // Cookies were lost during the login process, either because the browser
    // does not like the security settings, or the load balancer does not have
    // sticky sessions enabled.
    logger.warning('saml: session/cookie missing request identifier')
    res.redirect('/')
  }
})

// Construct a user object that samlp will accept for building the SAML
// response, and fill in some properties that the service might expect.
function buildResponseUser (user) {
  const email = user.email ? user.email : null
  let displayName = ''
  if (user.fullname) {
    displayName = user.fullname
  } else if (user.name) {
    displayName = user.name
  }
  const givenName = user.given_name ? user.given_name : ''
  const familyName = user.family_name ? user.family_name : ''
  return Object.assign({}, user, {
    id: user.nameID,
    emails: [email],
    displayName,
    name: {
      givenName,
      familyName
    }
  })
}

// Scenario in which extensions receive a SAML response from the client and need
// it to be validated, as well as fold in the available user profile data.
//
// eslint-disable-next-line no-unused-vars
router.post('/validate', async (req, res, next) => {
  try {
    isClientAuthorized(req)
    const saml = new SAML(idpOptions)
    try {
      const { profile } = await saml.validatePostResponseAsync(req.body)
      // This is effectively the /requests/status route for the IdP scenario.
      // Merge the information available in the SAML response (typically just a
      // nameID) with the information provided by the identity provider.
      logger.debug('saml: validated POST response for %s', profile.nameID)
      getUserById(profile.nameID).then((user) => {
        if (user) {
          const merged = Object.assign({}, profile, user.profile)
          res.json(merged)
        } else {
          res.json(profile)
        }
      })
    } catch (err) {
      logger.error('saml: validation error: %s', err)
      res.status(400).send(`error: ${err}`)
    }
  } catch (err) {
    if (err.code) {
      logger.warning('saml: authorization failed (%s): %s', err.code, err.message)
      res.status(err.code).send(err.message)
    } else {
      logger.error('saml: unexpected error:', err)
      res.status(500).send(err.message)
    }
  }
})

router.get('/logout', (req, res, next) => {
  if (req.session.logoutRedirect) {
    // login was performed via another protocol with HAS acting as the SAML IdP,
    // so return to that original protocol handler for logout
    res.redirect(req.session.logoutRedirect)
  } else {
    // passport-saml cannot do logout without a user session
    if (req.user) {
      next()
    } else {
      logger.debug('saml: no user for which to logout')
      res.redirect('/')
    }
  }
}, checkStrategy, passport.authenticate('saml', {
  samlFallback: 'logout-request'
}))

function handleSLO (req, res) {
  req.session.destroy()
  res.render('logout_success')
}

// some services use GET and some use POST
router.get('/slo', checkStrategy, passport.authenticate('saml', { samlFallback: 'logout-request' }), handleSLO)
router.post('/slo', checkStrategy, passport.authenticate('saml', { samlFallback: 'logout-request' }), handleSLO)

// Produce a "user" object that contains the information that passport-saml
// requires for logging out via SAML, as well as any exposed attributes.
function extractProfile (profile) {
  // we need these values to facilitate logout
  const basics = {
    nameID: profile.nameID,
    nameIDFormat: profile.nameIDFormat,
    sessionIndex: profile.sessionIndex
  }
  // peruse the SAML assertion result to find additional attributes
  const assertion = profile.getAssertion().Assertion
  const extras = {}
  if (assertion) {
    const statements = assertion.AttributeStatement
    if (statements) {
      for (const block of statements) {
        const attributes = block.Attribute
        if (attributes) {
          for (const attr of attributes) {
            // the strange property names and such come from the generic XML
            // parser which is simply translating the XML into JavaScript
            // objects in a one-to-one fashion
            extras[attr.$.Name] = attr.AttributeValue[0]._
          }
        }
      }
    }
  }
  return Object.assign({}, basics, extras)
}

// Process the PEM-encoded certificate into the string that passport-saml expects.
function readIdentityCert (fpath) {
  const text = fs.readFileSync(fpath, { encoding: 'utf-8' })
  return massageCertificate(text)
}

// Format the certificate text into a single line without begin/end lines.
function massageCertificate (text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l =>
    l !== '-----BEGIN CERTIFICATE-----' && l !== '-----END CERTIFICATE-----' && l.length > 0
  )
  return lines.join('')
}

// Remove secret, long, or boring entries from the configuration.
function scrubConfiguration (config) {
  return Object.fromEntries(Object.entries(config).filter(([key, value]) => {
    if (key === 'cert' || key === 'decryptionPvk' || key === 'privateKey') {
      // elide long and/or secret values
      return false
    }
    if (value === null || value === undefined) {
      // elide anything that is not interesting
      return false
    }
    return true
  }))
}

export default router
