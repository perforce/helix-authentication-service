//
// Copyright 2020-2022 Perforce Software
//
import * as fs from 'node:fs'
import { readFile } from 'node:fs/promises';
import express from 'express'
import passport from 'passport'
import { MultiSamlStrategy, Strategy as SamlStrategy } from '@node-saml/passport-saml'
import samlp from 'samlp'
import container from 'helix-auth-svc/lib/container.js'
import * as server from 'helix-auth-svc/lib/server.js'

const logger = container.resolve('logger')
const settings = container.resolve('settingsRepository')

function loadIdpOptions () {
  const serviceCert = publicKeyFile()
  const serviceKey = privateKeyFile()
  return {
    cert: fs.readFileSync(serviceCert, 'utf-8'),
    key: fs.readFileSync(serviceKey, 'utf-8'),
    issuer: 'urn:auth-service:idp',
    redirectEndpointPath: '/saml/login',
    postEndpointPath: '/saml/login',
    logoutEndpointPaths: {
      redirect: '/saml/logout'
    }
  }
}

async function loadSamlOptions (req, forceAuthn) {
  const serviceURI = server.getServiceURI(settings)
  const serviceKey = privateKeyFile()
  const certificate = await readFile(serviceKey, 'utf-8')
  // Changing these defaults, especially the issuer, is risky as there are
  // existing installations that might suddenly break when the service is
  // upgraded. Additionally, these values are documented in the admin guide.
  const defaults = {
    forceAuthn,
    callbackUrl: serviceURI + '/saml/sso',
    logoutCallbackUrl: serviceURI + '/saml/slo',
    issuer: 'https://has.example.com',
    decryptionPvk: certificate,
    privateKey: certificate,
    signatureAlgorithm: 'sha256',
    identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified'
  }
  const providerId = req.query.provider || req.session.provider || null
  const getSamlConfiguration = container.resolve('getSamlConfiguration')
  const configured = await getSamlConfiguration(providerId)
  return Object.assign({}, defaults, configured)
}

// Use multi-strategy to enable us to dynamically configure the SAML options.
const strategy = new MultiSamlStrategy(
  {
    getSamlOptions: (req, done) => {
      const findRequest = container.resolve('findRequest')
      findRequest(req.session.requestId || 'none').then((request) => {
        const forceAuthn = (request && request.forceAuthn) || false
        logger.debug('saml: forceAuthn set to %s', forceAuthn)
        return loadSamlOptions(req, forceAuthn)
      }).then((options) => {
        if (settings.has('DEBUG_SAML')) {
          logger.debug('saml: passport SAML configuration: %o', scrubConfiguration(options))
        }
        if (options.entryPoint === null || options.entryPoint === undefined) {
          logger.error('saml: IdP configuration missing entryPoint (SSO URL)')
          logger.error('saml: either set SAML_IDP_SSO_URL in the .env file,')
          logger.error('saml: or ensure the metadata contains SingleSignOnService,')
          logger.error('saml: or ensure signonUrl is defined in AUTH_PROVIDERS')
        }
        return done(null, options)
      }).catch((err) => {
        return done(err)
      })
    }
  }, (profile, done) => {
    return done(null, extractProfile(profile))
  }
)

const router = express.Router()
router.use(passport.initialize())
router.use(passport.session())
passport.serializeUser((user, done) => done(null, user))
passport.deserializeUser((obj, done) => done(null, obj))
passport.use(strategy)

function ensureStrategy (req, res, next) {
  // log the session identifier to help with cookie debugging
  logger.debug('saml: requestId: %s, sessionId: %s', req.session.requestId, req.sessionID)
  // Because passport-saml allows for a dynamically configured strategy
  // instance, we only need to check that it should work given there are
  // settings in place to enable SAML support.
  const metadataFile = settings.get('SAML_IDP_METADATA_FILE')
  const metadataUrl = settings.get('SAML_IDP_METADATA_URL')
  const idpSsoUrl = settings.get('SAML_IDP_SSO_URL')
  if (metadataFile || metadataUrl || idpSsoUrl) {
    next()
  } else {
    const getAuthProviders = container.resolve('getAuthProviders')
    getAuthProviders().then((providers) => {
      if (providers && providers.some((e) => e.protocol === 'saml')) {
        next()
      } else {
        res.render('no_strategy')
      }
    })
  }
}

router.get('/metadata', async (req, res) => {
  // Craft the service provider metadata with sensible defaults, without regards
  // to the identity provider, allowing for an identity provider to populate its
  // application configuration based on the service settings.
  try {
    const serviceCert = publicKeyFile()
    const serviceKey = privateKeyFile()
    const publicCert = await readFile(serviceCert, 'utf-8')
    const privateKey = await readFile(serviceKey, 'utf-8')
    const serviceURI = server.getServiceURI(settings)
    const issuer = settings.get('SAML_SP_ENTITY_ID')
    const audience = settings.get('SAML_SP_AUDIENCE')
    const signatureAlgorithm = settings.get('SP_KEY_ALGO')
    // Changing these defaults, especially the issuer, is risky as there are
    // existing installations that might suddenly break when the service is
    // upgraded. Additionally, these values are documented in the admin guide.
    const options = {
      callbackUrl: serviceURI + '/saml/sso',
      logoutCallbackUrl: serviceURI + '/saml/slo',
      issuer,
      audience,
      decryptionPvk: privateKey,
      privateKey,
      signatureAlgorithm,
      // Satisfy node-saml by including the 'cert' of the IdP, even though it is
      // the cert for the service, which won't matter for this function.
      cert: publicCert
    }
    const strategy = new SamlStrategy(options, (profile, done) => done(null, profile))
    const metadataXml = strategy.generateServiceProviderMetadata(publicCert, publicCert)
    res.header('Content-Type', 'text/xml').send(metadataXml)
  } catch (err) {
    logger.error('SAML metadata generation error: %o', err)
    res.render('error', {
      message: 'SAML metadata generation error: ' + err.message,
      details: 'Check the service logs for details.'
    })
  }
})

router.get('/idp/metadata', samlp.metadata(loadIdpOptions()))

function ensureAuthorized (req, res, next) {
  if (settings.has('PROMPT_FOR_AUTHORIZATION')) {
    const authorizeUrl = `/saml/authorize?rid=${req.session.requestId}`
    res.render('authorize', { authorizeUrl })
  } else {
    next()
  }
}

router.post('/authorize', (req, res, next) => {
  if (req.query.rid === req.session.requestId) {
    next()
  } else {
    res.render('error', {
      message: 'Authorization Failed',
      details: 'The request to approve a login has failed.'
    })
  }
}, passport.authenticate('saml', {
  keepSessionInfo: true,
  failureRedirect: '/saml/login_failed'
}))

router.get('/login/:id', (req, res, next) => {
  // save the request identifier for request/user mapping
  req.session.requestId = req.params.id
  req.session.showProfileData = req.query.test ? true : false
  // helpful for debugging secure cookie issues when running behind a proxy
  // c.f. http://expressjs.com/en/guide/behind-proxies.html
  if (settings.has('DEBUG_PROXY')) {
    logger.debug('saml: login request headers: %o', req.headers)
    logger.debug('saml: login request protocol: %s', req.protocol)
    logger.debug('saml: login request remote address: %s', req.socket.remoteAddress)
  }
  if (req.query.provider) {
    // save the provider identifier for subsequent calls
    req.session.provider = req.query.provider
  }
  next()
}, ensureStrategy, ensureAuthorized, passport.authenticate('saml', {
  keepSessionInfo: true,
  failureRedirect: '/saml/login_failed'
}))

// eslint-disable-next-line no-unused-vars
router.get('/login', (req, res, next) => {
  // Backward-compatible API for 1-step SAML behavior, in which the request does
  // not have a user identifier associated with a request identifier.
  samlp.parseRequest(req, (err, data) => {
    if (err) {
      logger.error('SAML AuthnRequest parse error: %o', err)
      res.render('error', {
        message: 'SAML AuthnRequest parse error: ' + err.message,
        details: 'Check the service logs for details.'
      })
    } else if (data) {
      if (settings.has('DEBUG_SAML')) {
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
      const startRequest = container.resolve('startRequest')
      const request = startRequest(data.id, forceAuthn)
      logger.debug('saml: new request %s for %s', request.id, data.id)
      // now that everything is set up, go through the normal login path
      const instanceId = settings.get('INSTANCE_ID')
      const generateLoginUrl = container.resolve('generateLoginUrl')
      generateLoginUrl('', request.id, instanceId).then((loginUrl) => {
        // After successful login with a possibly different protocol, signal the
        // other protocol to redirect back here so that the SAML response can be
        // sent back to the client application.
        req.session.successRedirect = '/saml/success'
        res.redirect(loginUrl)
      }).catch((err) => {
        logger.error('SAML login URL generation error: %o', err)
        res.render('error', {
          message: 'SAML login URL generation error: ' + err.message,
          details: 'Check the service logs for details.'
        })
      })
    }
  })
})

router.post('/sso', ensureStrategy, passport.authenticate('saml', {
  keepSessionInfo: true,
  successRedirect: '/saml/success',
  failureRedirect: '/saml/login_failed'
}))

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
    logger.debug('saml: session not authenticated')
    res.redirect('/')
  }
}

// eslint-disable-next-line no-unused-vars
router.get('/success', ensureAuthenticated, async (req, res, next) => {
  logger.debug('saml: /success, requestId: %s, sessionId: %s', req.session.requestId, req.sessionID)
  delete req.session.successRedirect
  const findRequest = container.resolve('findRequest')
  const request = await findRequest(req.session.requestId)
  if (request) {
    // clear the request identifier from the user session
    delete req.session.requestId
    // Detect if this is a request from another application in which the
    // "userId" is the client-generated request identifier.
    const clientId = req.session.authnRequest ? req.session.authnRequest.id : undefined
    if (request.userId === clientId) {
      // This is the SAML 1-step route, in which we do not have a known user
      // identifier to associate with the request. Default to using the nameID.
      //
      // However, if a different protocol is configured as the default, then we
      // may have to fake the nameID to something, probably the email.
      const assignNameIdentifier = container.resolve('assignNameIdentifier')
      req.user = assignNameIdentifier(req.user)
      logger.debug('saml: 1-step mapping %s to result %o', req.user.nameID, req.user)
      const receiveUserProfile = container.resolve('receiveUserProfile')
      receiveUserProfile(request.id, req.user.nameID, req.user)
      try {
        const validateSamlRequest = container.resolve('validateSamlRequest')
        const matches = await validateSamlRequest(
          req.session.authnRequest.issuer,
          req.session.authnRequest.acsUrl
        )
        if (matches) {
          logger.debug('saml: preparing SAML response for %s', req.session.authnRequest.id)
          // Generate a new SAML response befitting of the request we received.
          const moreOptions = Object.assign({}, loadIdpOptions(), {
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
          const generateSamlResponse = container.resolve('generateSamlResponse')
          const resp = await generateSamlResponse(req.user, moreOptions, request.id)
          if (settings.has('DEBUG_SAML')) {
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
        } else {
          logger.warning('saml: configured acsUrl for %s does not match %s',
            req.session.authnRequest.issuer,
            req.session.authnRequest.acsUrl)
          res.render('error', {
            message: 'SAML ACS URL mismatch',
            details: `SAML ACS URL ${req.session.authnRequest.acsUrl} does not match configuration`
          })
        }
      } catch (err) {
        logger.error('SAML response error: %o', err)
        res.render('error', {
          message: 'SAML response error: ' + err.message,
          details: 'Check the service logs for details.'
        })
      }
    } else {
      // "normal" success path, save user data for verification
      logger.debug('saml: mapping %s to result %o', request.userId, req.user)
      const receiveUserProfile = container.resolve('receiveUserProfile')
      receiveUserProfile(request.id, request.userId, req.user)
      const details = { name: req.user.nameID, profile: false }
      if (req.session.showProfileData) {
        details.profile = JSON.stringify(req.user, null, 2)
      }
      res.render('details', details)
    }
  } else {
    // Cookies were lost during the login process, either because the browser
    // does not like the security settings, or the load balancer does not have
    // sticky sessions enabled.
    logger.warning('saml: session/cookie missing request identifier')
    res.render('no_session', { name: req.user.nameID })
  }
})

// Scenario in which extension receives a SAML response from the client and
// needs it to be validated, as well as include the available user profile.
//
// eslint-disable-next-line no-unused-vars
router.post('/validate', async (req, res, next) => {
  try {
    const isClientAuthorized = container.resolve('isClientAuthorized')
    isClientAuthorized(req)
    try {
      const validateSamlResponse = container.resolve('validateSamlResponse')
      const options = loadIdpOptions()
      // temporary hack until we can insert the correct audience as given in the
      // IDP_CONFIG_FILE setting (e.g. "urn:swarm-example:sp")
      options.audience = false
      const { profile, requestId } = await validateSamlResponse(options, req.body)
      // This is effectively the /requests/status route for the IdP scenario.
      // Merge the information available in the SAML response (typically just a
      // nameID) with the information provided by the identity provider.
      logger.debug('saml: validated POST response for %s', profile.nameID)
      // no need to wait for response, we should already have it
      const findUserProfile = container.resolve('findUserProfile')
      const user = await findUserProfile(requestId, 0)
      if (user) {
        const merged = Object.assign({}, profile, user.profile)
        res.json(merged)
      } else {
        res.json(profile)
      }
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

router.get('/logout', ensureAuthenticated, (req, res, next) => {
  if (req.session.logoutRedirect) {
    // Login was performed via another protocol while the service was acting as
    // a SAML IdP, so return to that original protocol for logout.
    res.redirect(req.session.logoutRedirect)
  } else {
    next()
  }
}, ensureStrategy, passport.authenticate('saml', { samlFallback: 'logout-request' }))

function handleSLO (req, res) {
  req.session.destroy()
  res.render('logout_success')
}

// some services use GET and some use POST
router.get('/slo', ensureStrategy, passport.authenticate('saml', { samlFallback: 'logout-request' }), handleSLO)
router.post('/slo', ensureStrategy, passport.authenticate('saml', { samlFallback: 'logout-request' }), handleSLO)

// Get the name of the public certificate to use for SAML.
function publicKeyFile () {
  if (settings.has('SAML_CERT_FILE')) {
    return settings.get('SAML_CERT_FILE')
  }
  return settings.get('CERT_FILE')
}

// Get the name of the private key to use for SAML.
function privateKeyFile () {
  if (settings.has('SAML_KEY_FILE')) {
    return settings.get('SAML_KEY_FILE')
  }
  return settings.get('KEY_FILE')
}

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
