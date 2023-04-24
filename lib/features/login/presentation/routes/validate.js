//
// Copyright 2023 Perforce Software
//
import express from 'express'
import container from 'helix-auth-svc/lib/container.js'
import { getServiceURI } from 'helix-auth-svc/lib/server.js'
import multer from 'multer'

const logger = container.resolve('logger')
const settings = container.resolve('settingsRepository')
const router = express.Router()
const upload = multer()

router.post('/swarm', upload.single('config'), async (req, res) => {
  if (req.is('multipart/form-data')) {
    try {
      const validateSwarmConfig = container.resolve('validateSwarmConfig')
      const serviceUri = getServiceURI(settings)
      const swarmConfig = getUpload(req)
      const result = await validateSwarmConfig(serviceUri, swarmConfig)
      res.status(200).json(result)
    } catch (err) {
      logger.error('/validate/swarm POST: %s', err)
      res.sendStatus(500)
    }
  } else {
    logger.error(`/validate/swarm POST: content-type not valid: ${req.get('Content-Type')}`)
    res.status(400).send('Content-Type must be multipart/form-data')
  }
})

function getUpload(req) {
  // uploaded data may be attached as a file or simply plain text
  if (req.body.config) {
    return req.body.config
  }
  return req.file.buffer.toString()
}

export default router
