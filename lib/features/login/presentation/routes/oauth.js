//
// Copyright 2022 Perforce Software
//
import express from 'express'
import passport from 'passport'
import container from 'helix-auth-svc/lib/container.js'
import tokenStrategy from 'helix-auth-svc/lib/features/login/presentation/strategies/WebTokenStrategy.js'

const router = express.Router()
const verifyWebToken = container.resolve('verifyWebToken')
passport.use('oauth', tokenStrategy({ verifyWebToken }))

// eslint-disable-next-line no-unused-vars
router.get('/validate', passport.authenticate('oauth', { session: false }), async (req, res, next) => {
  // the request user object is the JWT payload
  res.json(req.user)
})

export default router
