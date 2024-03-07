//
// Copyright 2024 Perforce Software
//
import express from 'express'
import container from 'helix-auth-svc/lib/container.js'

const router = express.Router()

// eslint-disable-next-line no-unused-vars
router.get('/', async (req, res, next) => {
  const isReady = container.resolve('isReady')
  try {
    await isReady()
    res.sendStatus(200)
  } catch (err) {
    res.sendStatus(500, err.message)
  }
})

export default router
