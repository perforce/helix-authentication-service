//
// Copyright 2022 Perforce Software
//
import express from 'express'
import passport from 'passport'
import container from 'helix-auth-svc/lib/container.js'
import basicStrategy from 'helix-auth-svc/lib/features/admin/presentation/strategies/BasicAuthStrategy.js'
import tokenStrategy from 'helix-auth-svc/lib/features/admin/presentation/strategies/WebTokenStrategy.js'

const router = express.Router()
passport.use('jwt', tokenStrategy())
passport.use('basic', basicStrategy())

router.post('/create', passport.authenticate('basic', { session: false }), async (req, res) => {
  const registerWebToken = container.resolve('registerWebToken')
  const token = await registerWebToken()
  res.status(200).send(token)
})

router.post('/remove', passport.authenticate('jwt', { session: false }), async (req, res) => {
  const deleteWebToken = container.resolve('deleteWebToken')
  await deleteWebToken(req.user)
  res.sendStatus(200)
})

export default router
