//
// Copyright 2023 Perforce Software
//
import { AssertionError } from 'node:assert'
import express from 'express'
import cors from 'cors'
import passport from 'passport'
import container from 'helix-auth-svc/lib/container.js'
import { getServiceURI } from 'helix-auth-svc/lib/server.js'
import tokenStrategy from 'helix-auth-svc/lib/features/admin/presentation/strategies/WebTokenStrategy.js'

const logger = container.resolve('logger')
const settings = container.resolve('settingsRepository')
const router = express.Router()
passport.use('jwt', tokenStrategy())

// allow CORS requests for these routes to enable Fetch API
router.use(cors())
router.get('/', passport.authenticate('jwt', { session: false }), async (req, res) => {
  const readConfiguration = container.resolve('readConfiguration')
  try {
    const settings = await readConfiguration()
    // convert the Map to something that JSON can work with
    res.json(Object.fromEntries(settings))
  } catch (err) {
    logger.error('/settings GET: %s', err)
    res.sendStatus(500)
  }
})

router.post('/', passport.authenticate('jwt', { session: false }), async (req, res) => {
  if (req.is('application/json')) {
    if (settings.has('DEBUG_ADMIN')) {
      logger.debug('/settings POST: req.body: %o', req.body)
    }
    try {
      const writeConfiguration = container.resolve('writeConfiguration')
      // convert the JSON body to a Map as expected by the usecase
      const asMap = new Map(Object.entries(req.body))
      await writeConfiguration(asMap)
      // some popular client libraries expect a JSON response
      res.json({ status: 'ok' })
    } catch (err) {
      logger.error('/settings POST: %s', err)
      res.sendStatus(500)
    }
  } else {
    res.status(400).send('Content-Type must be application/json')
  }
})

router.post('/apply', passport.authenticate('jwt', { session: false }), async (req, res) => {
  // Look for the usecase that will apply the changes to the environment,
  // ignoring the case (unit tests) when that usecase is not available.
  const applyChanges = container.resolve('applyChanges', { allowUnregistered: true })
  if (applyChanges) {
    applyChanges()
  }
  // While the server eventually restarts asynchronously, read the settings from
  // the configuration and provide the updated service address.
  try {
    const readConfiguration = container.resolve('readConfiguration')
    const settings = await readConfiguration()
    const baseUri = getServiceURI(settings)
    res.location(baseUri)
    // some popular client libraries expect a JSON response
    res.json({ status: 'ok' })
  } catch (err) {
    logger.error('/settings/apply POST: %s', err)
    res.sendStatus(500)
  }
})

router.get('/providers', passport.authenticate('jwt', { session: false }), async (req, res) => {
  const getAuthProviders = container.resolve('getAuthProviders')
  try {
    const providers = await getAuthProviders()
    res.json({ 'providers': providers })
  } catch (err) {
    logger.error('/settings/providers GET: %s', err)
    res.sendStatus(500)
  }
})

router.post('/providers', passport.authenticate('jwt', { session: false }), async (req, res) => {
  if (req.is('application/json')) {
    if (settings.has('DEBUG_ADMIN')) {
      logger.debug('/settings/providers POST: req.body: %o', req.body)
    }
    const addAuthProvider = container.resolve('addAuthProvider')
    const writeConfiguration = container.resolve('writeConfiguration')
    try {
      // ensure the incoming provider does _not_ have an identifier as only the
      // backend is allowed to assign identifiers for new providers
      delete req.body.id
      const providers = await addAuthProvider(req.body)
      const incoming = new Map()
      incoming.set('AUTH_PROVIDERS', providers)
      await writeConfiguration(incoming)
      // return the assigned identifier for the new provider
      res.json({ status: 'ok', id: req.body.id })
    } catch (err) {
      if (err instanceof AssertionError) {
        res.status(400).send(err.message)
      } else {
        logger.error('/settings/providers POST: %s', err)
        res.sendStatus(500)
      }
    }
  } else {
    res.status(400).send('Content-Type must be application/json')
  }
})

router.get('/providers/:id', passport.authenticate('jwt', { session: false }), async (req, res) => {
  const providerId = req.params.id
  const getAuthProviders = container.resolve('getAuthProviders')
  try {
    const providers = await getAuthProviders()
    const provider = providers.find((e) => e.id === providerId)
    if (provider) {
      res.json(provider)
    } else {
      res.sendStatus(404)
    }
  } catch (err) {
    logger.error('/settings/providers GET: %s', err)
    res.sendStatus(500)
  }
})

router.put('/providers/:id', passport.authenticate('jwt', { session: false }), async (req, res) => {
  if (req.is('application/json')) {
    if (settings.has('DEBUG_ADMIN')) {
      logger.debug('/settings/providers POST: req.body: %o', req.body)
    }
    const getAuthProviders = container.resolve('getAuthProviders')
    const addAuthProvider = container.resolve('addAuthProvider')
    const writeConfiguration = container.resolve('writeConfiguration')
    try {
      const providers = await getAuthProviders()
      const provider = providers.find((e) => e.id === req.params.id)
      if (provider) {
        // allow for an optional id in the body, it's redundant anyway
        req.body.id = req.params.id
        const updated = await addAuthProvider(req.body)
        const incoming = new Map()
        incoming.set('AUTH_PROVIDERS', updated)
        await writeConfiguration(incoming)
        // some popular client libraries expect a JSON response
        res.json({ status: 'ok' })
      } else {
        res.sendStatus(404)
      }
    } catch (err) {
      if (err instanceof AssertionError) {
        res.status(400).send(err.message)
      } else {
        logger.error('/settings/providers/:id PUT: %s', err)
        res.sendStatus(500)
      }
    }
  } else {
    res.status(400).send('Content-Type must be application/json')
  }
})

router.delete('/providers/:id', passport.authenticate('jwt', { session: false }), async (req, res) => {
  const getAuthProviders = container.resolve('getAuthProviders')
  const writeConfiguration = container.resolve('writeConfiguration')
  try {
    const providers = await getAuthProviders()
    const provider = providers.find((e) => e.id === req.params.id)
    if (provider) {
      const updated = providers.filter((e) => e.id !== req.params.id)
      const incoming = new Map()
      incoming.set('AUTH_PROVIDERS', updated)
      await writeConfiguration(incoming)
      // some popular client libraries expect a JSON response
      res.json({ status: 'ok' })
    } else {
      res.sendStatus(404)
    }
  } catch (err) {
    if (err instanceof AssertionError) {
      res.status(400).send(err.message)
    } else {
      logger.error('/settings/providers/:id PUT: %s', err)
      res.sendStatus(500)
    }
  }
})

export default router
