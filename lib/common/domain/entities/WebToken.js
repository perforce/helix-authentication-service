//
// Copyright 2022 Perforce Software
//
import * as assert from 'node:assert'

//
// JSON web token entity.
//
class WebToken {
  constructor (header, payload, signature) {
    assert.ok(header, 'web-token: header must be defined')
    assert.ok(payload, 'web-token: payload must be defined')
    assert.ok(signature, 'web-token: signature must be defined')
    this._header = header
    this._payload = payload
    this._signature = signature
  }

  // Return the audience (aud) from the payload.
  get audience () {
    return this._payload.aud
  }

  // Return the key id (kid) from the header.
  get keyid () {
    return this._header.kid
  }

  // Convert from the raw base64 encoded JSON, returning null if invalid.
  static fromRaw (token) {
    assert.ok(token, 'web-token: token must be defined')
    //
    // This has some inherent risk in breaking down the token into parts, base64
    // decoding, and parsing the supposed JSON. The assumption made here is that
    // the Node.js library is reasonably up-to-date with respect to attacks
    // related to base64 encoding and JSON formatting.
    //
    const firstDot = token.indexOf('.')
    if (firstDot > 0) {
      const firstPart = token.substring(0, firstDot)
      const secondDot = token.indexOf('.', firstDot + 1)
      const secondPart = token.substring(firstDot + 1, secondDot)
      let header
      let payload
      try {
        header = JSON.parse(Buffer.from(firstPart, 'base64').toString())
        payload = JSON.parse(Buffer.from(secondPart, 'base64').toString())
      } catch (err) {
        throw new Error('malformed json web token')
      }
      const signature = token.substring(secondDot + 1)
      if (signature.length === 0) {
        throw new Error('jwt signature is required')
      }
      return new WebToken(header, payload, signature)
    }
    throw new Error('invalid json web token')
  }
}

export { WebToken }
