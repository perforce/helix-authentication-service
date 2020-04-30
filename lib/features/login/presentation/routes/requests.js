//
// Copyright 2020 Perforce Software
//
const express = require('express')
const router = express.Router()
const minimatch = require('minimatch')
const container = require('@lib/container')
const server = require('@lib/server')

const logger = container.resolve('logger')
const findRequest = container.resolve('findRequest')
const findUserProfile = container.resolve('findUserProfile')
const receiveUserProfile = container.resolve('receiveUserProfile')
const startRequest = container.resolve('startRequest')
const serviceURI = server.getServiceURI(process.env)

// How long to wait (in ms) for user details before returning 408.
const requestTimeout = (parseInt(process.env.LOGIN_TIMEOUT) || 60) * 1000

// :id is the user identifier (e.g. email)
router.get('/new/:userId', (req, res, next) => {
  // Start the login request for the associated "user" identifier.
  const userId = req.params.userId
  const forceAuthn = Boolean(req.query.forceAuthn || process.env.FORCE_AUTHN || false)
  const request = startRequest(userId, forceAuthn)
  logger.debug('requests: new request %s for %s', request.id, userId)
  // Assemble a default login URL as a convenience for the client.
  const protocol = process.env.DEFAULT_PROTOCOL || 'saml'
  const loginUrl = `${serviceURI}/${protocol}/login/${request.id}`
  res.json({
    request: request.id,
    loginUrl,
    baseUrl: serviceURI
  })
})

// **ONLY** expose this when running in a test environment.
if (process.env.NODE_ENV === 'automated_tests') {
  // For testing only, inserts a user profile into the cache.
  router.post('/insert/:requestId', (req, res, next) => {
    const request = findRequest(req.params.requestId)
    if (request) {
      receiveUserProfile(request.userId, req.body)
      res.json({ status: 'ok' })
    } else {
      res.json({ status: 'error' })
    }
  })
}

// :id is the request identifier returned from /new/:id
router.get('/status/:requestId', async (req, res, next) => {
  //
  // Check for valid client certificates. This is set up in the options to
  // https.createServer(), namely the `ca`, `requestCert`, and
  // `rejectUnauthorized` properties. We then assert that the request is
  // authorized, and if not we give the client some explanation.
  //
  let cert
  let authorized
  const protocol = server.getProtocol(process.env)
  if (protocol === 'https:' && req.connection.getPeerCertificate) {
    // These calls only work when the service is using HTTPS, which is likely
    // not the case when running on test system (e.g. PingFederate with OIDC
    // rejects self-signed certificates).
    cert = req.connection.getPeerCertificate()
    authorized = req.client.authorized
    if (process.env.CLIENT_CERT_CN) {
      authorized = cert && cert.subject && minimatch(cert.subject.CN, process.env.CLIENT_CERT_CN)
    }
  } else if (protocol === 'http:') {
    // have to assume the client is okay
    authorized = true
  }
  if (authorized) {
    // Look for the pending request, then check if the user associated with the
    // request has successfully authenticated. Wait for a while as the user may
    // still be authenticating with the identity provider.
    try {
      const requestId = req.params.requestId
      const user = await findUserProfile(requestId, requestTimeout)
      if (user) {
        logger.debug('requests: resolved user for %s (%s)', user.id, requestId)
        res.json(user.profile)
      } else {
        // no such request, move on to the next handler (a likely 404)
        next()
      }
    } catch (err) {
      res.status(408).send('Request Timeout')
    }
  } else if (cert && cert.subject) {
    const msg = `Sorry ${cert.subject.CN}, certificates from ${cert.issuer.CN} are not supported.`
    res.status(403).send(msg)
  } else {
    res.status(401).send('Sorry, but you need to provide a client certificate to continue.')
  }
})

module.exports = router
