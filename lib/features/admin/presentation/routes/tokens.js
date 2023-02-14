//
// Copyright 2022 Perforce Software
//
import express from 'express'
import cors from 'cors'
import passport from 'passport'
import container from 'helix-auth-svc/lib/container.js'
import tokenStrategy from 'helix-auth-svc/lib/features/admin/presentation/strategies/WebTokenStrategy.js'

const validateCredentials = container.resolve('validateCredentials')
const settings = container.resolve('settingsRepository')
const router = express.Router()
passport.use('jwt', tokenStrategy())

// allow CORS requests for this route to enable Fetch API
router.options('/', cors())
router.post('/', cors(), async (req, res) => {
  // Enforce the request is as described in RFC 6749 section 4.3, without the
  // need for client authentication (i.e. a bearer token).
  if (req.body.grant_type === 'password') {
    if (
      req.body.username && req.body.password &&
      await validateCredentials(req.body.username, req.body.password)
    ) {
      const registerWebToken = container.resolve('registerWebToken')
      const token = await registerWebToken()
      const tokenTtl = settings.getInt('TOKEN_TTL')
      const response = {
        'token_type': 'bearer',
        'access_token': token,
        'expires_in': tokenTtl
      }
      res.json(response)
    } else {
      res.status(401).json({status: 401, message: 'Unauthorized'})
    }
  } else {
    res.status(400).json({status: 400, message: 'Provided grant_type is invalid' })
  }
})

router.delete('/', passport.authenticate('jwt', { session: false }), async (req, res) => {
  const deleteWebToken = container.resolve('deleteWebToken')
  await deleteWebToken(req.user)
  // some popular client libraries expect a JSON resposne
  res.json({ status: 'ok' })
})

export default router
