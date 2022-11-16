//
// Copyright 2022 Perforce Software
//
import * as assert from 'node:assert'
import * as crypto from 'node:crypto'
import jwt from 'jsonwebtoken'

/**
 * Create a JSON web token and save it in the token registry.
 *
 * @returns {String} base64-encoded JSON web token.
 */
export default ({ tokenRepository, settingsRepository }) => {
  assert.ok(tokenRepository, 'register: token repository must be defined')
  assert.ok(settingsRepository, 'register: settings repository must be defined')
  return () => {
    const tokenTtl = settingsRepository.getInt('TOKEN_TTL') * 1000
    return new Promise((resolve, reject) => {
      // create a sufficiently long unique secret for each token
      //
      // after dropping Node v14 support, we can use this instead:
      //
      // const key = crypto.generateKeySync('hmac', { length: 256 })
      // const secret = key.export().toString('hex')
      //
      const key = crypto.randomBytes(32)
      const secret = key.toString('hex')
      const issuer = settingsRepository.get('SVC_BASE_URI') || 'https://localhost:3000'
      const audience = crypto.randomUUID()
      const payload = {}
      const options = {
        audience,
        issuer,
        expiresIn: tokenTtl / 1000,
        algorithm: 'HS256'
      }
      jwt.sign(payload, secret, options, (err, token) => {
        if (err) {
          reject(err)
        } else {
          // save the token secret for later verification
          tokenRepository.set(audience, secret)
          resolve(token)
        }
      })
    })
  }
}
