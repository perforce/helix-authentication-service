//
// Copyright 2020 Perforce Software
//
const fs = require('fs')
const express = require('express')
const router = express.Router()
const passport = require('passport')
const MultiSamlStrategy = require('passport-saml/multiSamlStrategy')
const { fetch, toPassportConfig } = require('passport-saml-metadata')
const samlp = require('samlp')
const { ulid } = require('ulid')
const container = require('@lib/container')
const server = require('@lib/server')

const logger = container.resolve('logger')
const findRequest = container.resolve('findRequest')
const getUserById = container.resolve('getUserById')
const receiveUserProfile = container.resolve('receiveUserProfile')
const startRequest = container.resolve('startRequest')
const serviceURI = server.getServiceURI(process.env)

const idpOptions = {
  cert: fs.readFileSync(container.resolve('serviceCert')),
  key: fs.readFileSync(container.resolve('serviceKey')),
  issuer: 'urn:auth-service:idp',
  redirectEndpointPath: '/saml/login',
  postEndpointPath: '/saml/login',
  logoutEndpointPaths: {
    redirect: '/saml/logout'
  }
}
const defaultIdpConfigFile = require.resolve('@root/routes/saml_idp.conf.js')
const idpConfFile = process.env.IDP_CONFIG_FILE || defaultIdpConfigFile
const idpConfig = require(idpConfFile)
function getPostURL (req, callback) {
  const issuer = req.session.authnRequest.issuer
  if (issuer in idpConfig && 'acsUrl' in idpConfig[issuer]) {
    const url = idpConfig[issuer].acsUrl
    logger.debug('saml: POST URL %s for %s', url, issuer)
    if (url) {
      callback(null, url)
      return
    }
  }
  callback(new Error(`no mapping for [${issuer}]['acsUrl'] in ${idpConfFile}`), null)
}

const samlOptions = {
  callbackUrl: serviceURI + '/saml/sso',
  logoutCallbackUrl: serviceURI + '/saml/slo',
  entryPoint: process.env.SAML_IDP_SSO_URL || undefined,
  logoutUrl: process.env.SAML_IDP_SLO_URL || undefined,
  issuer: process.env.SAML_SP_ENTITY_ID || process.env.SAML_SP_ISSUER || 'https://has.example.com',
  idpIssuer: process.env.SAML_IDP_ENTITY_ID || process.env.SAML_IDP_ISSUER || undefined,
  audience: process.env.SAML_SP_AUDIENCE || undefined,
  authnContext: process.env.SAML_AUTHN_CONTEXT || undefined,
  decryptionPvk: fs.readFileSync(container.resolve('serviceKey'), 'utf-8'),
  privateCert: fs.readFileSync(container.resolve('serviceKey'), 'utf-8'),
  signatureAlgorithm: process.env.SP_KEY_ALGO || 'sha256',
  identifierFormat: process.env.SAML_NAMEID_FORMAT || 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified'
}
if (process.env.IDP_CERT_FILE) {
  // cannot specify an undefined 'cert' so must do this conditionally
  samlOptions.cert = readIdentityCert(process.env.IDP_CERT_FILE)
}

// Use multi-strategy to enable us to dynamically configure the SAML options.
const strategy = new MultiSamlStrategy(
  {
    getSamlOptions: (req, done) => {
      // determine if we should force authentication
      const request = findRequest(req.session.requestId || 'none')
      const force = (request && request.forceAuthn) || false
      logger.debug('saml: forceAuthn set to %s', force)
      fetchIdpMetadata().then((config) => {
        const options = Object.assign({}, config, { forceAuthn: force })
        logger.debug('saml: passport SAML configuration: %o', scrubConfiguration(options))
        return done(null, options)
      })
    }
  }, (profile, done) => {
    return done(null, extractProfile(profile))
  }
)
if (process.env.SAML_IDP_METADATA_URL || process.env.SAML_IDP_SSO_URL) {
  logger.debug('saml: passport strategy enabled')
  passport.use(strategy)
} else {
  logger.debug('saml: passport strategy not available')
}
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
      logger.debug('saml: parsed request: %o', data)
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
      // use a specific user identifier so we can recognize this request in the
      // success route
      startRequest('SAML:IdP:marker', forceAuthn, data.id)
      req.session.successRedirect = '/saml/success'
      // ensure that logout takes the appropriate route later
      const proto = process.env.DEFAULT_PROTOCOL
      if (proto && proto !== 'saml') {
        // only set this if _not_ already using SAML by default
        req.session.logoutRedirect = `/${proto}/logout`
      }
      // now that everything is set up, go through the normal login path
      res.redirect(`/${proto || 'saml'}/login/${data.id}`)
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
    res.redirect('/')
  }
}

// eslint-disable-next-line no-unused-vars
router.get('/success', checkAuthentication, (req, res, next) => {
  req.session.successRedirect = null
  const request = findRequest(req.session.requestId)
  if (request) {
    // clear the request identifier from the user session
    req.session.requestId = null
    if (request.userId === 'SAML:IdP:marker') {
      // This is the SAML 1-step route, in which we do not have a known user
      // identifier to associate with the request. Default to using the nameID.
      //
      // However, if a different protocol is configured as the default, then we
      // may have to fake the nameID to something, probably the email.
      assignNameId(req.user)
      logger.debug('saml: 1-step mapping %s to result %o', req.user.nameID, req.user)
      receiveUserProfile(req.user.nameID, req.user)
      // Generate a new SAML response befitting of the request we received.
      const moreOptions = Object.assign({}, idpOptions, {
        audience: req.session.authnRequest.issuer,
        destination: req.session.authnRequest.acsUrl,
        recipient: req.session.authnRequest.acsUrl,
        inResponseTo: req.session.authnRequest.id,
        authnContextClassRef: 'urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport',
        sessionIndex: undefined,
        includeAttributeNameFormat: true
      })
      if (req.session.authnRequest.context && req.session.authnRequest.context.authnContextClassRef) {
        moreOptions.authnContextClassRef = req.session.authnRequest.context.authnContextClassRef
      }
      getPostURL(req, (err, url) => {
        if (err) {
          res.render('error', {
            message: 'SAML response error: ' + err.message,
            error: err
          })
        } else if (url) {
          if (moreOptions.recipient !== url) {
            res.render('error', {
              message: `SAML ACS URL ${url} does not match recipient ${moreOptions.recipient}`,
              error: new Error('SAML ACS URL mismatch')
            })
          } else {
            // make a user object that samlp will work with
            const user = buildResponseUser(req.user)
            samlp.getSamlResponse(moreOptions, user, (err, resp) => {
              if (err) {
                res.render('error', {
                  message: 'SAML response error: ' + err.message,
                  error: err
                })
              } else {
                // render an HTML form to send the response back to the SP
                res.set('Content-Security-Policy', "script-src 'unsafe-inline'")
                res.render('samlresponse', {
                  AcsUrl: url,
                  SAMLResponse: Buffer.from(resp, 'utf-8').toString('base64'),
                  RelayState: req.session.authnRequest.relayState
                })
              }
            })
          }
        }
      })
    } else {
      // "normal" success path, save user data for verification
      logger.debug('saml: mapping %s to result %o', request.userId, req.user)
      receiveUserProfile(request.userId, req.user)
      const name = req.user.nameID
      res.render('details', { name })
    }
  } else {
    res.redirect('/')
  }
})

// If the `nameID` property is missing, attempt to set it to a reasonable value.
// If `nameIDFormat` property is missing, set it to the "unspecified" value.
function assignNameId (user) {
  if (!user.nameID) {
    let nameID = null
    const nameIdField = process.env.SAML_NAMEID_FIELD
    // Different identity providers have different fields that make good
    // candidates for the fake name identifier. Start with whatever the
    // administrator specified, it anything.
    if (nameIdField && user[nameIdField]) {
      nameID = user[nameIdField]
    } else if (user.email) {
      nameID = user.email
    } else if (user.sub) {
      nameID = user.sub
    } else {
      // need to use some unique value if nothing else
      nameID = ulid()
    }
    user.nameID = nameID
    logger.debug('saml: 1-step setting nameID to %s', nameID)
  }
  // Same with nameIDFormat, the SAML library requires that it have a value,
  // so default to something sensible if not set.
  if (!user.nameIDFormat) {
    user.nameIDFormat = 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified'
    logger.debug('saml: 1-step setting nameIDFormat to unspecified')
  }
}

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
router.post('/validate', (req, res, next) => {
  const cert = server.getClientCert(req)
  const authorized = server.isClientAuthorized(req, cert, process.env.CLIENT_CERT_CN)
  if (authorized) {
    strategy._saml.validatePostResponse(req.body, (err, profile, loggedOut) => {
      if (err) {
        res.status(400).send(`error: ${err}`)
      } else if (loggedOut) {
        res.status(400).send('error: logged out?')
      } else {
        // This is effectively the /requests/status route for the IdP scenario.
        // Merge the information available in the SAML response (typically just a
        // nameID) with the information provided by the identity provider.
        const user = getUserById(profile.nameID)
        if (user) {
          const merged = Object.assign({}, profile, user.profile)
          res.json(merged)
        } else {
          res.json(profile)
        }
      }
    })
  } else if (cert && cert.subject) {
    const msg = `certificates for ${cert.subject.CN} from ${cert.issuer.CN} are not permitted`
    res.status(403).send(msg)
  } else {
    res.status(401).send('client certificate required')
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

const cachedIdpMetadata = new Map()

function fetchIdpMetadata () {
  // eslint-disable-next-line no-unused-vars
  return new Promise((resolve, reject) => {
    if (process.env.SAML_IDP_METADATA_URL) {
      fetch({
        url: process.env.SAML_IDP_METADATA_URL,
        backupStore: cachedIdpMetadata
      }).then((reader) => {
        // Some services (azure) will advertise multiple certs but the last one
        // is not necessarily valid, so pass everything every time.
        const config = toPassportConfig(reader, { multipleCerts: true })
        // merge idp metadata with configured and default settings
        for (const propName in samlOptions) {
          if (!config[propName]) {
            config[propName] = samlOptions[propName]
          }
        }
        massageIdpMetadata(config)
        resolve(config)
      }).catch(err => {
        logger.error('saml: error fetching IdP metadata: %s', err)
        resolve(samlOptions)
      })
    } else {
      resolve(samlOptions)
    }
  })
}

// Change the structure and/or data formatting to make passport-saml happy.
function massageIdpMetadata (config) {
  // In particular the IdP may return an array of certificates and they may be
  // line-wrapped, which passport-saml is documented as not accepting.
  if (config.cert) {
    if (Array.isArray(config.cert) && config.cert.length > 0) {
      config.cert = config.cert[0]
    }
    if (typeof config.cert === 'string') {
      config.cert = massageCertificate(config.cert)
    }
  }
}

// Remove secret, long, or boring entries from the configuration.
function scrubConfiguration (config) {
  return Object.fromEntries(Object.entries(config).filter(([key, value]) => {
    if (key === 'cert' || key === 'decryptionPvk' || key === 'privateCert') {
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

module.exports = router
