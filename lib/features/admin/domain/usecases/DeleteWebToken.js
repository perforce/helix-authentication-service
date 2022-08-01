//
// Copyright 2022 Perforce Software
//
import * as assert from 'node:assert'

/**
 * Remove the given JSON web token from the token registry.
 */
export default ({ tokenRepository }) => {
  assert.ok(tokenRepository, 'register: token repository must be defined')
  return (payload) => {
    assert.ok(payload, 'verify: token payload must be defined')
    return new Promise((resolve, reject) => {
      if (payload.aud) {
        tokenRepository.delete(payload.aud).then(() => {
          resolve()
        }).catch((err) => reject(err))
      } else {
        reject(new Error('missing aud property in token'))
      }
    })
  }
}
