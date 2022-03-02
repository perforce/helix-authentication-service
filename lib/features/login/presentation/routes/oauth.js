//
// Copyright 2022 Perforce Software
//
import express from 'express'
import container from 'helix-auth-svc/lib/container.js'

const logger = container.resolve('logger')
const validateWebToken = container.resolve('validateWebToken')
const bearerPrefix = 'Bearer '
const router = express.Router()

// eslint-disable-next-line no-unused-vars
router.get('/validate', async (req, res, next) => {
  const authorization = req.get('Authorization')
  if (authorization && authorization.startsWith(bearerPrefix)) {
    const token = authorization.substring(bearerPrefix.length)
    try {
      const payload = await validateWebToken(token)
      res.json(payload)
    } catch (err) {
      logger.error('oauth: error processing jwt:', err)
      if (err.message.includes('tenant ID')) {
        res.status(403).send('tid does not match tenant ID')
      } else {
        res.status(400).send(err.message)
      }
    }
  } else {
    res.status(401).send('provide JWT via Authorization header')
  }
})

export default router
