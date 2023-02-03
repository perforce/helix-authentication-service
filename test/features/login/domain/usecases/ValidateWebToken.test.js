//
// Copyright 2022 Perforce Software
//
import * as fs from 'node:fs'
import * as http from 'node:http'
import NodeRSA from 'node-rsa'
import { temporaryFile } from 'tempy'
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { before, beforeEach, describe, it } from 'mocha'
import jwt from 'jsonwebtoken'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'
import ValidateWebToken from 'helix-auth-svc/lib/features/login/domain/usecases/ValidateWebToken.js'

describe('ValidateWebToken use case', function () {
  const settingsRepository = new MapSettingsRepository()
  let usecase

  before(function () {
    if (process.env.UNIT_ONLY) {
      this.skip()
    } else {
      usecase = ValidateWebToken({ settingsRepository })
    }
  })

  beforeEach(function () {
    settingsRepository.clear()
  })

  it('should raise an error for invalid input', async function () {
    assert.throws(() => ValidateWebToken({ settingsRepository: null }), AssertionError)
    try {
      await usecase(null)
      assert.fail('should have raised error')
    } catch (err) {
      assert.instanceOf(err, AssertionError)
    }
  })

  it('should approve a valid JSON web token', async function () {
    // arrange
    settingsRepository.set('OAUTH_JWKS_URI', 'http://jwt.doc:3000/.well-known/jwks.json')
    settingsRepository.set('OAUTH_AUDIENCE', 'api://25b17cdb-4c8d-434c-9a21-86d67ac501d1')
    settingsRepository.set('OAUTH_ISSUER', 'http://jwt.doc:3000/')
    settingsRepository.set('OAUTH_ALGORITHM', 'RS256')
    settingsRepository.set('OAUTH_TENANT_ID', '719d88f3-f957-44cf-9aa5-0a1a3a44f7b9')
    const payload = {
      sub: '8e7341ad-cba6-4f6f-8061-88b8b18d3885',
      tid: '719d88f3-f957-44cf-9aa5-0a1a3a44f7b9',
      aud: 'api://25b17cdb-4c8d-434c-9a21-86d67ac501d1'
    }
    const token = await getToken(JSON.stringify(payload))
    // act
    const result = await usecase(token)
    // assert
    assert.equal(result.aud, payload.aud)
    assert.equal(result.sub, payload.sub)
    assert.equal(result.tid, payload.tid)
  })

  it('should approve a valid JWT with minimal conditions', async function () {
    // arrange
    settingsRepository.set('OAUTH_JWKS_URI', 'http://jwt.doc:3000/.well-known/jwks.json')
    settingsRepository.set('OAUTH_ALGORITHM', 'RS256')
    const payload = {
      sub: '8e7341ad-cba6-4f6f-8061-88b8b18d3885',
      tid: '719d88f3-f957-44cf-9aa5-0a1a3a44f7b9',
      aud: 'api://25b17cdb-4c8d-434c-9a21-86d67ac501d1'
    }
    const token = await getToken(JSON.stringify(payload))
    // act
    const result = await usecase(token)
    // assert
    assert.equal(result.aud, payload.aud)
    assert.equal(result.sub, payload.sub)
    assert.equal(result.tid, payload.tid)
  })

  it('should approve token when using signing key', async function () {
    this.timeout(10000)
    // arrange
    const keydata = await getSigningKey()
    const keyfile = temporaryFile({ extension: 'key' })
    fs.writeFileSync(keyfile, keydata)
    settingsRepository.set('OAUTH_SIGNING_KEY_FILE', keyfile)
    settingsRepository.set('OAUTH_ALGORITHM', 'RS256')
    const payload = {
      sub: '8e7341ad-cba6-4f6f-8061-88b8b18d3885',
      tid: '719d88f3-f957-44cf-9aa5-0a1a3a44f7b9',
      aud: 'api://25b17cdb-4c8d-434c-9a21-86d67ac501d1'
    }
    const token = await getToken(JSON.stringify(payload))
    // act
    const result = await usecase(token)
    // assert
    assert.equal(result.aud, payload.aud)
    assert.equal(result.sub, payload.sub)
    assert.equal(result.tid, payload.tid)
  })

  it('should approve token with expected keyid', async function () {
    // arrange
    const keyid = await getKeyId()
    settingsRepository.set('OAUTH_JWKS_URI', 'http://jwt.doc:3000/.well-known/jwks.json')
    settingsRepository.set('OAUTH_JWKS_KEYID', keyid)
    settingsRepository.set('OAUTH_ALGORITHM', 'RS256')
    const payload = {
      sub: '8e7341ad-cba6-4f6f-8061-88b8b18d3885',
      tid: '719d88f3-f957-44cf-9aa5-0a1a3a44f7b9',
      aud: 'api://25b17cdb-4c8d-434c-9a21-86d67ac501d1'
    }
    const token = await getToken(JSON.stringify(payload))
    // act
    const result = await usecase(token)
    // assert
    assert.equal(result.aud, payload.aud)
    assert.equal(result.sub, payload.sub)
    assert.equal(result.tid, payload.tid)
  })

  it('should fail if OAUTH_JWKS_KEYID does not match', async function () {
    // arrange
    settingsRepository.set('OAUTH_JWKS_URI', 'http://jwt.doc:3000/.well-known/jwks.json')
    settingsRepository.set('OAUTH_JWKS_KEYID', 'notthekeyiwasexpecting')
    const payload = {
      sub: '8e7341ad-cba6-4f6f-8061-88b8b18d3885',
      tid: '719d88f3-f957-44cf-9aa5-0a1a3a44f7b9',
      aud: 'api://25b17cdb-4c8d-434c-9a21-86d67ac501d1'
    }
    const token = await getToken(JSON.stringify(payload))
    try {
      // act
      await usecase(token)
      assert.fail('should have raised error')
    } catch (err) {
      // assert
      assert.include(err.message, 'Unable to find a signing key')
    }
  })

  it('should fail if missing OAUTH_JWKS_URI setting', async function () {
    // arrange
    const payload = {
      sub: '8e7341ad-cba6-4f6f-8061-88b8b18d3885',
      tid: '719d88f3-f957-44cf-9aa5-0a1a3a44f7b9',
      aud: 'api://25b17cdb-4c8d-434c-9a21-86d67ac501d1'
    }
    const token = await getToken(JSON.stringify(payload))
    try {
      // act
      await usecase(token)
      assert.fail('should have raised error')
    } catch (err) {
      // assert
      assert.include(err.message, 'missing either OAUTH_JWKS_URI')
    }
  })

  it('should fail if missing OAUTH_ALGORITHM setting', async function () {
    // arrange
    settingsRepository.set('OAUTH_JWKS_URI', 'http://jwt.doc:3000/.well-known/jwks.json')
    const payload = {
      sub: '8e7341ad-cba6-4f6f-8061-88b8b18d3885',
      tid: '719d88f3-f957-44cf-9aa5-0a1a3a44f7b9',
      aud: 'api://25b17cdb-4c8d-434c-9a21-86d67ac501d1'
    }
    const token = await getToken(JSON.stringify(payload))
    try {
      // act
      await usecase(token)
      // without explicitly setting the algorithm, jsonwebtoken will reject the
      // verification because the default 'none' does not match the value in our
      // genuine token
      assert.fail('should have raised error')
    } catch (err) {
      // assert
      assert.include(err.message, 'invalid algorithm')
    }
  })

  it('should reject malformed web token', async function () {
    // arrange
    settingsRepository.set('OAUTH_JWKS_URI', 'http://jwt.doc:3000/.well-known/jwks.json')
    const token = 'notavalidtokenatall'
    try {
      // act
      await usecase(token)
      assert.fail('should have raised error')
    } catch (err) {
      // assert
      assert.include(err.message, 'invalid json web token')
    }
  })

  it('should reject token with missing key id', async function () {
    // arrange
    settingsRepository.set('OAUTH_JWKS_URI', 'http://jwt.doc:3000/.well-known/jwks.json')
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE2NTg3OTM1NDEsImV4cCI6MTY1ODc5MzU1MSwiYXVkIjoiYmRhNjc0ZWUtY2RmNS00YWJhLWE5NDMtZTRiZmE4YzE3ZTFmIiwiaXNzIjoiaHR0cHM6Ly9oYXMuZXhhbXBsZS5jb20ifQ.XI4vJcJ7sdy9LSOXaJTyeSVNr2A4hXTulpxQ5h8xDxg'
    try {
      // act
      await usecase(token)
      assert.fail('should have raised error')
    } catch (err) {
      // assert
      assert.include(err.message, 'no `kid` found in JWT header')
    }
  })

  it('should reject JWT with missing signature', async function () {
    const keyid = await getKeyId()
    const header = base64json({
      alg: 'none',
      kid: keyid
    })
    const payload = base64json({
      sub: '8e7341ad-cba6-4f6f-8061-88b8b18d3885',
      tid: '719d88f3-f957-44cf-9aa5-0a1a3a44f7b9',
      aud: 'api://25b17cdb-4c8d-434c-9a21-86d67ac501d1'
    })
    const token = header + '.' + payload + '.'
    settingsRepository.set('OAUTH_JWKS_URI', 'http://jwt.doc:3000/.well-known/jwks.json')
    try {
      // act
      await usecase(token)
      assert.fail('should have raised error')
    } catch (err) {
      // assert
      assert.include(err.message, 'jwt signature is required')
    }
  })

  it('should reject JWT with incorrect algorithm', async function () {
    // arrange
    const payload = {
      sub: '8e7341ad-cba6-4f6f-8061-88b8b18d3885',
      tid: '719d88f3-f957-44cf-9aa5-0a1a3a44f7b9',
      aud: 'api://25b17cdb-4c8d-434c-9a21-86d67ac501d1'
    }
    const token = await forgedToken(JSON.stringify(payload))
    settingsRepository.set('OAUTH_JWKS_URI', 'http://jwt.doc:3000/.well-known/jwks.json')
    settingsRepository.set('OAUTH_ALGORITHM', 'RS256')
    try {
      // act
      await usecase(token)
      // this time the algorithm does not match the expected value
      assert.fail('should have raised error')
    } catch (err) {
      // assert
      assert.include(err.message, 'invalid algorithm')
    }
  })

  it('should reject JWT header with bad JSON', async function () {
    // arrange
    settingsRepository.set('OAUTH_JWKS_URI', 'http://jwt.doc:3000/.well-known/jwks.json')
    const token = 'dGhpc2lzbm90anNvbg.eyJ1c2VyIjogImpvaG4ifQ.'
    try {
      // act
      await usecase(token)
      assert.fail('should have raised error')
    } catch (err) {
      // assert
      assert.include(err.message, 'malformed json web token')
    }
  })

  it('should reject web token signed by another party', async function () {
    // arrange
    settingsRepository.set('OAUTH_JWKS_URI', 'http://jwt.doc:3000/.well-known/jwks.json')
    const token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6Ik1yNS1BVWliZkJpaTdOZDFqQmViYXhib1hXMCIsImtpZCI6Ik1yNS1BVWliZkJpaTdOZDFqQmViYXhib1hXMCJ9.eyJhdWQiOiJhcGk6Ly8yNWIxN2NkYi00YzhkLTQzNGMtOWEyMS04NmQ2N2FjNTAxZDEiLCJpc3MiOiJodHRwczovL3N0cy53aW5kb3dzLm5ldC83MTlkODhmMy1mOTU3LTQ0Y2YtOWFhNS0wYTFhM2E0NGY3YjkvIiwiaWF0IjoxNjQwMDM4OTY2LCJuYmYiOjE2NDAwMzg5NjYsImV4cCI6MTY0MDEyNTY2NiwiYWlvIjoiRTJaZ1lLaStuWnA3NmQ0TDdRc0Y2Zzk1TGF3NUFBPT0iLCJhcHBpZCI6ImYzNjRmZjE3LTllNDItNGY3ZS1iNzAwLTExZTE5YmEyYWM2ZiIsImFwcGlkYWNyIjoiMiIsImlkcCI6Imh0dHBzOi8vc3RzLndpbmRvd3MubmV0LzcxOWQ4OGYzLWY5NTctNDRjZi05YWE1LTBhMWEzYTQ0ZjdiOS8iLCJvaWQiOiI0ZGJkZjQ1MC05NThkLTRjNjQtODhiMi1hYmJhMmU0NmYxZmYiLCJyaCI6IjAuQVN3QTg0aWRjVmY1ejBTYXBRb2FPa1QzdVJmX1pQTkNubjVQdHdBUjRadWlyRzhzQUFBLiIsInJvbGVzIjpbIlBlcmZvcmNlLkNhbGwiXSwic3ViIjoiNGRiZGY0NTAtOTU4ZC00YzY0LTg4YjItYWJiYTJlNDZmMWZmIiwidGlkIjoiNzE5ZDg4ZjMtZjk1Ny00NGNmLTlhYTUtMGExYTNhNDRmN2I5IiwidXRpIjoiNm5XeVVFbjJGMC00OVlVNG02bDBBQSIsInZlciI6IjEuMCJ9.fS2f3IoYxr2VlJd4BCxT4o3ikqdyjJY1AGVRe7-tBWmpZSbyKOAs39WIYReWp5vMShW1JKv_r37bYSMbIHhz0bfKM-OkQELEdOsfVoBbywkXSoxCoGXAj5q1RxuCPUEnX59UlgCNa2_Z6Rc765O9BSz7BbYBlaW2Bh6OIzTywBW2Lyn987PxiewsIECSUCP_v4lY9VsS5PUo3iQgAygQ1qUQQf3FKunZhL8SOYuz-PcGpkZqC9F8FCah3wMbyekfLu5Tjhujg7lL_RiBgQqkRjXc5WZDft0md4j-4zGQDmPCE73NP2Xh-9mkpu8cZFw-lz-wOZ8SXF43yjfpy1CxSQ'
    try {
      // act
      await usecase(token)
      assert.fail('should have raised error')
    } catch (err) {
      // assert
      assert.include(err.message, 'Unable to find a signing key')
    }
  })

  it('should reject web token with incorrect tid', async function () {
    // arrange
    settingsRepository.set('OAUTH_JWKS_URI', 'http://jwt.doc:3000/.well-known/jwks.json')
    settingsRepository.set('OAUTH_ALGORITHM', 'RS256')
    settingsRepository.set('OAUTH_TENANT_ID', '719d88f3-f957-44cf-9aa5-0a1a3a44f7b9')
    const payload = {
      sub: '719d88f3-f957-44cf-9aa5-0a1a3a44f7b9',
      tid: '8e7341ad-cba6-4f6f-8061-88b8b18d3885',
      aud: 'api://25b17cdb-4c8d-434c-9a21-86d67ac501d1'
    }
    const token = await getToken(JSON.stringify(payload))
    try {
      // act
      await usecase(token)
      assert.fail('should have raised error')
    } catch (err) {
      // assert
      assert.include(err.message, 'tid does not match tenant ID')
    }
  })

  it('should reject web token with incorrect aud', async function () {
    // arrange
    settingsRepository.set('OAUTH_JWKS_URI', 'http://jwt.doc:3000/.well-known/jwks.json')
    settingsRepository.set('OAUTH_ALGORITHM', 'RS256')
    settingsRepository.set('OAUTH_AUDIENCE', 'http://oauth.example.com')
    settingsRepository.set('OAUTH_TENANT_ID', '719d88f3-f957-44cf-9aa5-0a1a3a44f7b9')
    const payload = {
      sub: '719d88f3-f957-44cf-9aa5-0a1a3a44f7b9',
      tid: '8e7341ad-cba6-4f6f-8061-88b8b18d3885',
      aud: 'api://25b17cdb-4c8d-434c-9a21-86d67ac501d1'
    }
    const token = await getToken(JSON.stringify(payload))
    try {
      // act
      await usecase(token)
      assert.fail('should have raised error')
    } catch (err) {
      // assert
      assert.include(err.message, 'jwt audience invalid')
    }
  })
})

// connect to jwt.doc:3000 to get a JWT for testing
function getToken(payload) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'jwt.doc',
      port: 3000,
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        resolve(data)
      })
    })
    req.on('error', (e) => {
      reject(e)
    })
    req.write(payload)
    req.end()
  })
}

function base64json (value) {
  const s = Buffer.from(JSON.stringify(value), 'utf-8').toString('base64')
  return s.replace(/=+$/, '');
}

// Forge a token by using the jwt.doc public key as a shared secret, crafting a
// new token whose keyid matches jwt.doc, but changing the algorithm to HS256 in
// the hopes of tricking the verification routine into trusting this token.
function forgedToken (payload) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'jwt.doc',
      port: 3000,
      path: '/.well-known/jwks.json',
      method: 'GET'
    }, (res) => {
      let data = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        const jwks = JSON.parse(data)
        const secret = jwks.keys[0].kid
        const keyid = jwks.keys[0].kid
        const token = jwt.sign(payload, secret, { algorithm: 'HS256', keyid })
        // This can be verified as a valid token on https://jwt.io if you paste
        // the jwt.doc public key as the shared secret.
        resolve(token)
      })
    })
    req.on('error', (e) => {
      reject(e)
    })
    req.end()
  })
}

function getKeyId () {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'jwt.doc',
      port: 3000,
      path: '/.well-known/jwks.json',
      method: 'GET'
    }, (res) => {
      let data = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        const jwks = JSON.parse(data)
        resolve(jwks.keys[0].kid)
      })
    })
    req.on('error', (e) => {
      reject(e)
    })
    req.end()
  })
}

function getSigningKey () {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'jwt.doc',
      port: 3000,
      path: '/.well-known/jwks.json',
      method: 'GET'
    }, (res) => {
      let data = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        // reconstruct the public key from the raw components; we happen to know
        // that the jwtdummy service constructs keys of 2048 bits
        const jwks = JSON.parse(data)
        const key = new NodeRSA({ b: 2048 })
        key.importKey({
          n: Buffer.from(jwks.keys[0].n, 'base64'),
          e: Buffer.from(jwks.keys[0].e, 'base64')
        })
        const publickey = key.exportKey('public')
        resolve(publickey)
      })
    })
    req.on('error', (e) => {
      reject(e)
    })
    req.end()
  })
}
