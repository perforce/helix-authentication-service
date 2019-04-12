//
// Copyright 2019 Perforce Software
//
const debug = require('debug')('oidc:server')
const express = require('express')
const router = express.Router()
const { ulid } = require('ulid')
const { users, requests } = require('../store')

// How long to wait (in ms) for user details before returning 408.
const requestTimeout = 60 * 1000

// :id is the user identifier (e.g. email)
router.get('/new/:id', (req, res, next) => {
  // Always generate a new request every time, and use that request identifer as
  // the key, as the user may be logging in from different client systems.
  const requestId = ulid()
  debug('new request %s for %s', requestId, req.params.id)
  requests.set(requestId, req.params.id)
  res.json({
    request: requestId
  })
})

// :id is the request identifier returned from /new/:id
router.get('/status/:id', async (req, res, next) => {
  //
  // Check for validate client certificates. This is set up in the options to
  // https.createServer(), namely the `ca`, `requestCert`, and
  // `rejectUnauthorized` properties. We then assert that the request is
  // authorized, and if not we give the client some explanation.
  //
  // Another option is to use a passport extension which does essentially the
  // same thing: https://github.com/ripjar/passport-client-cert
  //
  const cert = req.connection.getPeerCertificate()
  if (req.client.authorized) {
    // Look for the pending request, then check if the user associated with the
    // request has successfully authenticated. Wait for a while as the user may
    // still be authenticating with the identity provider.
    if (requests.has(req.params.id)) {
      const userId = requests.getIfPresent(req.params.id)
      try {
        let user = await new Promise((resolve, reject) => {
          if (users.has(userId)) {
            // data is ready, no need to wait
            resolve(users.getIfPresent(userId))
          } else {
            // wait for the data to become available
            const timeout = setInterval(() => {
              if (users.has(userId)) {
                clearInterval(timeout)
                resolve(users.getIfPresent(userId))
              }
            }, 1000)
            // but don't wait too long
            req.connection.setTimeout(requestTimeout, () => {
              clearInterval(timeout)
              reject(new Error('timeout'))
            })
          }
        })
        debug('resolved user for %s (%s)', userId, req.params.id)
        res.json(user)
      } catch (err) {
        res.status(408).send('Request Timeout')
      }
    } else {
      // no such request, move on to the next handler (a likely 404)
      next()
    }
  } else if (cert.subject) {
    const msg = `Sorry ${cert.subject.CN}, certificates from ${cert.issuer.CN} are not supported.`
    res.status(403).send(msg)
  } else {
    res.status(401).send(`Sorry, but you need to provide a client certificate to continue.`)
  }
})

module.exports = router
