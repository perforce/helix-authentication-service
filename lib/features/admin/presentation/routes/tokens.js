//
// Copyright 2022 Perforce Software
//
import express from 'express'
import passport from 'passport'
import container from 'helix-auth-svc/lib/container.js'
import tokenStrategy from 'helix-auth-svc/lib/features/admin/presentation/strategies/WebTokenStrategy.js'

const validateCredentials = container.resolve('validateCredentials')
const router = express.Router()
passport.use('jwt', tokenStrategy())

router.post('/create', async (req, res) => {
  // Enforce the request is as described in RFC 6749 section 4.3, without the
  // need for client authentication (i.e. a bearer token).
  if (req.body.grant_type === 'password') {
    if (validateCredentials(req.body.username, req.body.password)) {
      const registerWebToken = container.resolve('registerWebToken')
      const token = await registerWebToken()
      const tokenTtl = container.resolve('tokenTtl')
      const response = {
        'token_type': 'bearer',
        'access_token': token,
        'expires_in': tokenTtl / 1000
      }
      if (req.body.state) {
        response.state = req.body.state
      }
      res.json(response)
    } else {
      res.status(401).send('Unauthorized')
    }
  } else {
    res.status(400).send('grant_type invalid')
  }
})

router.post('/remove', passport.authenticate('jwt', { session: false }), async (req, res) => {
  const deleteWebToken = container.resolve('deleteWebToken')
  await deleteWebToken(req.user)
  res.sendStatus(200)
})

export default router
