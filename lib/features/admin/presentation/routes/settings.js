//
// Copyright 2023 Perforce Software
//
import express from 'express'
import cors from 'cors'
import passport from 'passport'
import container from 'helix-auth-svc/lib/container.js'
import { getServiceURI } from 'helix-auth-svc/lib/server.js'
import tokenStrategy from 'helix-auth-svc/lib/features/admin/presentation/strategies/WebTokenStrategy.js'

const router = express.Router()
passport.use('jwt', tokenStrategy())

// allow CORS requests for these routes to enable Fetch API
router.use(cors())
router.get('/', passport.authenticate('jwt', { session: false }), async (req, res) => {
  const readConfiguration = container.resolve('readConfiguration')
  const settings = await readConfiguration()
  // convert the Map to something that JSON can work with
  res.json(Object.fromEntries(settings))
})

router.post('/', passport.authenticate('jwt', { session: false }), async (req, res) => {
  if (req.is('application/json')) {
    // remove any temporary configuration that may have been set earlier
    const deleteTempConfig = container.resolve('deleteTempConfig')
    await deleteTempConfig()
    const writeConfiguration = container.resolve('writeConfiguration')
    // convert the JSON body to a Map as expected by the usecase
    const asMap = new Map(Object.entries(req.body))
    await writeConfiguration(asMap)
    // some popular client libraries expect a JSON resposne
    res.json({ status: 'ok' })
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
  const readConfiguration = container.resolve('readConfiguration')
  const settings = await readConfiguration()
  const baseUri = getServiceURI(settings)
  res.location(baseUri)
  // some popular client libraries expect a JSON resposne
  res.json({ status: 'ok' })
})

router.post('/temp', passport.authenticate('jwt', { session: false }), async (req, res) => {
  if (req.is('application/json')) {
    const writeTempConfig = container.resolve('writeTempConfig')
    // convert the JSON body to a Map as expected by the usecase
    const asMap = new Map(Object.entries(req.body))
    await writeTempConfig(asMap)
    // some popular client libraries expect a JSON resposne
    res.json({ status: 'ok' })
  } else {
    res.status(400).send('Content-Type must be application/json')
  }
})

router.delete('/temp', passport.authenticate('jwt', { session: false }), async (req, res) => {
  const deleteTempConfig = container.resolve('deleteTempConfig')
  await deleteTempConfig()
  // some popular client libraries expect a JSON resposne
  res.json({ status: 'ok' })
})

export default router
