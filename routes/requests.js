//
// Copyright 2019 Perforce Software
//
const debug = require('debug')('auth:server')
const express = require('express')
const router = express.Router()
const { ulid } = require('ulid')
const url = require('url')
const { users, requests } = require('../store')

// How long to wait (in ms) for user details before returning 408.
const requestTimeout = (parseInt(process.env.LOGIN_TIMEOUT) || 60) * 1000

// :id is the user identifier (e.g. email)
router.get('/new/:id', (req, res, next) => {
  // Always generate a new request every time, and use that request identifer as
  // the key, as the user may be logging in from different client systems.
  const requestId = ulid()
  debug('new request %s for %s', requestId, req.params.id)
  // Construct the "user" object which holds the request identifier and any
  // additional properties that enable certain features.
  const forceAuthn = Boolean(req.query.forceAuthn || process.env.FORCE_AUTHN || false)
  const user = {
    id: req.params.id,
    forceAuthn
  }
  // Assemble a default login URL as a convenience for the client.
  const protocol = process.env.DEFAULT_PROTOCOL || 'saml'
  const baseUrl = process.env.SVC_BASE_URI
  const loginUrl = `${baseUrl}/${protocol}/login/${requestId}`
  requests.set(requestId, user)
  res.json({
    request: requestId,
    loginUrl,
    baseUrl
  })
})

// :id is the request identifier returned from /new/:id
router.get('/status/:id', async (req, res, next) => {
  //
  // Check for valid client certificates. This is set up in the options to
  // https.createServer(), namely the `ca`, `requestCert`, and
  // `rejectUnauthorized` properties. We then assert that the request is
  // authorized, and if not we give the client some explanation.
  //
  // Another option is to use a passport extension which does essentially the
  // same thing: https://github.com/ripjar/passport-client-cert
  //
  let cert
  let authorized
  const protocol = getProtocol()
  if (protocol === 'https:') {
    // These calls only work when the service is using HTTPS, which is likely
    // not the case when running on test system (e.g. PingFederate with OIDC
    // rejects self-signed certificates).
    cert = req.connection.getPeerCertificate()
    authorized = req.client.authorized
  } else if (protocol === 'http:') {
    // have to assume the client is okay
    authorized = true
  }
  if (authorized) {
    // Look for the pending request, then check if the user associated with the
    // request has successfully authenticated. Wait for a while as the user may
    // still be authenticating with the identity provider.
    if (requests.has(req.params.id)) {
      const userRecord = requests.getIfPresent(req.params.id)
      try {
        const user = await new Promise((resolve, reject) => {
          if (users.has(userRecord.id)) {
            // data is ready, no need to wait; remove the user profile data to
            // prevent replay attack
            resolve(users.delete(userRecord.id))
          } else {
            // wait for the data to become available
            const timeout = setInterval(() => {
              if (users.has(userRecord.id)) {
                clearInterval(timeout)
                // prevent replay attack
                resolve(users.delete(userRecord.id))
              }
            }, 1000)
            // but don't wait too long
            req.connection.setTimeout(requestTimeout, () => {
              clearInterval(timeout)
              reject(new Error('timeout'))
            })
          }
        })
        debug('resolved user for %s (%s)', userRecord.id, req.params.id)
        res.json(user)
      } catch (err) {
        res.status(408).send('Request Timeout')
      }
    } else {
      // no such request, move on to the next handler (a likely 404)
      next()
    }
  } else if (cert && cert.subject) {
    const msg = `Sorry ${cert.subject.CN}, certificates from ${cert.issuer.CN} are not supported.`
    res.status(403).send(msg)
  } else {
    res.status(401).send(`Sorry, but you need to provide a client certificate to continue.`)
  }
})

function getProtocol () {
  if (process.env.PROTOCOL) {
    // change the format to match that of url.URL()
    return process.env.PROTOCOL + ':'
  }
  const u = new url.URL(process.env.SVC_BASE_URI)
  return u.protocol
}

module.exports = router
