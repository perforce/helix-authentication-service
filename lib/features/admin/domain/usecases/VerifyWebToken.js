//
// Copyright 2022 Perforce Software
//
import * as assert from 'node:assert'
import jwt from 'jsonwebtoken'
import { WebToken } from 'helix-auth-svc/lib/common/domain/entities/WebToken.js'

/**
 * Validate the given JSON Web Token based on the application settings.
 *
 * @param {String} token - base64-encoded JSON web token.
 * @return {Object} web token payload as an object.
 * @throws {Error} if validation fails for any reason.
 */
export default ({ tokenRepository, settingsRepository }) => {
  assert.ok(tokenRepository, 'verify: token repository must be defined')
  assert.ok(settingsRepository, 'verify: settings repository must be defined')
  return (token) => {
    assert.ok(token, 'verify: token must be defined')
    return new Promise((resolve, reject) => {
      const webToken = WebToken.fromRaw(token)
      if (webToken) {
        if (webToken.audience) {
          const issuer = settingsRepository.get('SVC_BASE_URI') || 'https://localhost:3000'
          tokenRepository.get(webToken.audience).then((secret) => {
            if (secret) {
              const options = { algorithms: ['HS256'], audience: webToken.audience, issuer }
              jwt.verify(token, secret, options, (err, payload) => {
                if (err) {
                  if (typeof err === jwt.TokenExpiredError) {
                    resolve(null)
                  } else {
                    reject(err)
                  }
                } else {
                  resolve(payload)
                }
              })
            } else {
              resolve(null)
            }
          }).catch((err) => reject(err))
        } else {
          reject(new Error('missing aud property in token'))
        }
      } else {
        reject(new Error('malformed json web token'))
      }
    })
  }
}
