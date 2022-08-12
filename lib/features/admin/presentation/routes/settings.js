//
// Copyright 2022 Perforce Software
//
import express from 'express'
import cors from 'cors'
import passport from 'passport'
import container from 'helix-auth-svc/lib/container.js'
import tokenStrategy from 'helix-auth-svc/lib/features/admin/presentation/strategies/WebTokenStrategy.js'

const logger = container.resolve('logger')
const router = express.Router()
passport.use('jwt', tokenStrategy())

// allow CORS requests for these routes to enable Fetch API
router.use(cors())
router.get('/fetch', passport.authenticate('jwt', { session: false }), async (req, res) => {
  const readConfiguration = container.resolve('readConfiguration')
  const settings = await readConfiguration()
  // convert the Map to something that JSON can work with
  res.status(200).json(Object.fromEntries(settings))
})

router.post('/update', passport.authenticate('jwt', { session: false }), async (req, res) => {
  if (req.is('application/json')) {
    const writeConfiguration = container.resolve('writeConfiguration')
    // convert the JSON body to a Map as expected by the usecase
    const asMap = new Map(Object.entries(req.body))
    await writeConfiguration(asMap)
    res.sendStatus(200)
  } else {
    logger.error(`/settings/update POST: content-type not valid: ${req.get('Content-Type')}`)
    res.status(400).send('Content-Type must be application/json')
  }
})

router.post('/apply', async (req, res) => {
  // send ourselves the signal to restart the server
  process.kill(process.pid, 'SIGUSR2')
  res.sendStatus(200)
})

export default router
