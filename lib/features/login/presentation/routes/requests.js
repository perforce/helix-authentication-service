//
// Copyright 2024 Perforce Software
//
import express from 'express'
import cors from 'cors'
import container from 'helix-auth-svc/lib/container.js'
import * as server from 'helix-auth-svc/lib/server.js'

const logger = container.resolve('logger')
const settings = container.resolve('settingsRepository')
const router = express.Router()

// allow CORS requests for these routes to enable Fetch API
router.use(cors(server.corsConfiguration(settings)))

// :userId is an arbitrary user identifier decided by the client
//
// eslint-disable-next-line no-unused-vars
router.get('/new/:userId', async (req, res, next) => {
  // Start the login request for the associated "user" identifier.
  const userId = req.params.userId
  const forceAuthn = assessTruth(req.query.forceAuthn || settings.get('FORCE_AUTHN'))
  const startRequest = container.resolve('startRequest')
  const request = startRequest(userId, forceAuthn)
  logger.debug('requests: new request %s for %s', request.id, userId)
  const instanceId = settings.get('INSTANCE_ID')
  const serviceURI = server.getServiceURI(settings)
  const generateLoginUrl = container.resolve('generateLoginUrl')
  // if providerId is given, pass it along to generate a URL for that provider;
  // if that provider is not found, the multi login URL will be generated
  const loginUrl = await generateLoginUrl(serviceURI, request.id, instanceId, req.query.providerId)
  const statusUrl = `${serviceURI}/requests/status/${request.id}?instanceId=${instanceId}`
  res.json({
    request: request.id,
    loginUrl,
    loginTestUrl: `${loginUrl}&test=1`,
    statusUrl,
    baseUrl: serviceURI,
    forceAuthn: request.forceAuthn,
    userId,
    instanceId
  })
})

// Return true if given value is defined and its toString() is non-empty.
function assessTruth(value) {
  return !(value === undefined || value === null || value.toString() === '')
}

// **ONLY** expose this when running in a test environment.
if (settings.get('NODE_ENV') === 'automated_tests') {
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
router.get('/status/:requestId', async (req, res) => {
  try {
    const isClientAuthorized = container.resolve('isClientAuthorized')
    isClientAuthorized(req)
    // How long to wait (in ms) for user details before returning 408.
    const requestTimeout = settings.getInt('LOGIN_TIMEOUT', 60) * 1000
    const findUserProfile = container.resolve('findUserProfile')
    const user = await findUserProfile(req.params.requestId, requestTimeout)
    if (user) {
      logger.debug('requests: resolved user for %s (%s)', user.id, req.params.requestId)
      res.json(user.profile)
    } else {
      res.status(404).send('no such request')
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
