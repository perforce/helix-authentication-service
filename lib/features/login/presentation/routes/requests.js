//
// Copyright 2020-2022 Perforce Software
//
import express from 'express'
import container from 'helix-auth-svc/lib/container.js'
import * as server from 'helix-auth-svc/lib/server.js'
import * as common from 'helix-auth-svc/lib/features/login/presentation/routes/common.js'

const logger = container.resolve('logger')
const settings = container.resolve('settingsRepository')
const router = express.Router()

// :userId is an arbitrary user identifier decided by the client
//
// eslint-disable-next-line no-unused-vars
router.get('/new/:userId', (req, res, next) => {
  // Start the login request for the associated "user" identifier.
  const userId = req.params.userId
  const forceAuthn = Boolean(req.query.forceAuthn || process.env.FORCE_AUTHN || false)
  const startRequest = container.resolve('startRequest')
  const request = startRequest(userId, forceAuthn)
  logger.debug('requests: new request %s for %s', request.id, userId)
  // Assemble a default login URL as a convenience for the client.
  const protocol = common.defaultProtocol(settings)
  const instanceId = process.env.INSTANCE_ID || 'none'
  const serviceURI = server.getServiceURI(settings)
  const loginUrl = `${serviceURI}/${protocol}/login/${request.id}?instanceId=${instanceId}`
  const statusUrl = `${serviceURI}/requests/status/${request.id}?instanceId=${instanceId}`
  res.json({
    request: request.id,
    loginUrl,
    loginTestUrl: `${loginUrl}&test=1`,
    statusUrl,
    baseUrl: serviceURI,
    userId,
    instanceId
  })
})

// **ONLY** expose this when running in a test environment.
if (process.env.NODE_ENV === 'automated_tests') {
  // For testing only, inserts a user profile into the cache.
  //
  // eslint-disable-next-line no-unused-vars
  router.post('/insert/:requestId', async (req, res, next) => {
    // verify that the request exists
    const findRequest = container.resolve('findRequest')
    const request = await findRequest(req.params.requestId)
    if (request) {
      const receiveUserProfile = container.resolve('receiveUserProfile')
      receiveUserProfile(request.id, request.userId, req.body)
      res.json({ status: 'ok' })
    } else {
      res.json({ status: 'error' })
    }
  })
}

// :requestId is the request identifier returned from /new/:userId
router.get('/status/:requestId', async (req, res, next) => {
  try {
    const isClientAuthorized = container.resolve('isClientAuthorized')
    isClientAuthorized(req)
    // How long to wait (in ms) for user details before returning 408.
    const requestTimeout = (parseInt(process.env.LOGIN_TIMEOUT, 10) || 60) * 1000
    const findUserProfile = container.resolve('findUserProfile')
    const user = await findUserProfile(req.params.requestId, requestTimeout)
    if (user) {
      logger.debug('requests: resolved user for %s (%s)', user.id, req.params.requestId)
      res.json(user.profile)
    } else {
      // no such request, move on to the next handler (a likely 404)
      next()
    }
  } catch (err) {
    if (err.code) {
      logger.warning('requests: authorization failed (%s): %s', err.code, err.message)
      res.status(err.code).send(err.message)
    } else {
      logger.error('requests: unexpected error:', err)
      res.status(500).send(err.message)
    }
  }
})

export default router
