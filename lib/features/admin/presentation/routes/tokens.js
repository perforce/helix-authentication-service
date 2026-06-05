//
// Copyright 2022 Perforce Software
//
import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import passport from 'passport'
import container from 'helix-auth-svc/lib/container.js'
import { corsConfiguration } from 'helix-auth-svc/lib/server.js'
import tokenStrategy from 'helix-auth-svc/lib/features/admin/presentation/strategies/WebTokenStrategy.js'

const validateCredentials = container.resolve('validateCredentials')
const settings = container.resolve('settingsRepository')
const router = express.Router()
const verifyWebToken = container.resolve('verifyWebToken')
passport.use('jwt', tokenStrategy({ verifyWebToken }))

// Throttle login attempts per client address to slow down brute-force attacks
// against the admin credentials. The window and limit can be tuned via settings.
const loginLimiter = rateLimit({
  windowMs: settings.getInt('LOGIN_RATE_LIMIT_WINDOW', 15 * 60 * 1000),
  limit: settings.getInt('LOGIN_RATE_LIMIT', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 429, message: 'Too many requests' },
  // The client address is derived from express' "trust proxy" setting, which the
  // operator configures via TRUST_PROXY (the same trust the service already
  // relies on for secure session cookies). Disable the permissive-trust-proxy
  // validation so a "trust proxy" of true does not throw on every request.
  validate: { trustProxy: false }
})

// allow CORS requests for this route to enable Fetch API, restricted to the
// configured origin rather than allowing any origin with a wildcard
router.options('/', cors(corsConfiguration(settings)))
router.post('/', cors(corsConfiguration(settings)), loginLimiter, async (req, res) => {
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
  res.json({ status: 200, message: 'ok' })
})

export default router
