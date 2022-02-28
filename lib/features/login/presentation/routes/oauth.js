//
// Copyright 2022 Perforce Software
//
import express from 'express'
import jwksClient from 'jwks-rsa'
import jwt from 'jsonwebtoken'
import container from 'helix-auth-svc/lib/container.js'

const logger = container.resolve('logger')
const settings = container.resolve('settingsRepository')
const jwksUri = settings.get('OAUTH_JWKS_URI')
const audience = settings.get('OAUTH_AUDIENCE')
const issuer = settings.get('OAUTH_ISSUER')
const algorithm = settings.get('OAUTH_ALGORITHM')
const tenantId = settings.get('OAUTH_TENANT_ID')

// Return the value for the 'kid' property in the JWT header, or null if
// anything goes wrong.
function extractKid (jwt) {
  //
  // Anything that goes wrong here will result in an exception.
  //
  // This has some inherent risk in breaking down the token into parts, base64
  // decoding, and parsing the supposed JSON. The assumption made here is that
  // the Node.js library is reasonably up-to-date with respect to attacks
  // related to base64 encoding and JSON formatting.
  //
  const firstDot = jwt.indexOf('.')
  if (firstDot > 0) {
    const firstPart = jwt.substring(0, firstDot)
    try {
      const header = JSON.parse(Buffer.from(firstPart, 'base64').toString())
      return header.kid
    } catch (err) {
      // fall through
    }
  }
  return null
}

const bearerPrefix = 'Bearer '
const router = express.Router()

// eslint-disable-next-line no-unused-vars
router.get('/validate', async (req, res, next) => {
  const authorization = req.get('Authorization')
  if (authorization && authorization.startsWith(bearerPrefix)) {
    // the jwks-rsa library will cache the keys for 10 minutes by default
    const client = jwksClient({ jwksUri })
    const token = authorization.substring(bearerPrefix.length)
    const kid = extractKid(token)
    if (kid) {
      try {
        const key = await client.getSigningKey(kid)
        const signingKey = key.getPublicKey()
        const options = { algorithms: [algorithm], audience, issuer }
        jwt.verify(token, signingKey, options, (err, payload) => {
          if (err) {
            res.status(400).send(`jwt verification error: ${err}`)
          } else {
            if (tenantId) {
              if (tenantId === payload.tid) {
                res.json(payload)
              } else {
                res.status(403).send('tid does not match tenant ID')
              }
            } else {
              res.json(payload)
            }
          }
        })
      } catch (err) {
        logger.error('oauth: error processing jwt:', err)
        // this was probably an error on the part of the client
        res.status(400).send(err.message)
      }
    } else {
      res.status(400).send('bearer token could not be processed')
    }
  } else {
    res.status(401).send('provide JWT via Authorization header')
  }
})

export default router
