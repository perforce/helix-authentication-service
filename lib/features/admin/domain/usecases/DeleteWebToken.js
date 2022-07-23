//
// Copyright 2022 Perforce Software
//
import * as assert from 'node:assert'
import { WebToken } from 'helix-auth-svc/lib/common/domain/entities/WebToken.js'

/**
 * Remove the given JSON web token from the token registry.
 */
export default ({ tokenRepository }) => {
  assert.ok(tokenRepository, 'register: token repository must be defined')
  return (token) => {
    assert.ok(token, 'verify: token must be defined')
    return new Promise((resolve, reject) => {
      const webToken = WebToken.fromRaw(token)
      if (webToken) {
        if (webToken.audience) {
          tokenRepository.delete(webToken.audience).then(() => {
            // missing or not is treated the same
            resolve()
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
