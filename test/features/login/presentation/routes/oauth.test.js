//
// Copyright 2020-2022 Perforce Software
//
import * as http from 'node:http'
import { assert } from 'chai'
import { describe, it, run } from 'mocha'
import jwt from 'jsonwebtoken'
import request from 'supertest'
// Load the test environment before the bulk of our code initializes, otherwise
// it will be too late due to the `import` early-binding behavior.
import 'helix-auth-svc/test/env.js'
import createApp from 'helix-auth-svc/lib/app.js'
import { createServer } from 'helix-auth-svc/lib/server.js'
import container from 'helix-auth-svc/lib/container.js'

// Tests must be run with `mocha --delay --exit` otherwise we do not give the
// server enough time to start up, and the server hangs indefinitely because
// mocha no longer exits after the tests complete.

const settings = container.resolve('settingsRepository')
const app = createApp()
const server = createServer(app, settings)
const agent = request.agent(server)

//
// Give the server a chance to start up asynchronously. This works in concert
// with the --delay flag to the mocha command. A timeout of zero is not quite
// sufficient, so this timing is somewhat fragile.
//
setTimeout(function () {
  describe('OAuth requests', function () {
    describe('Success cases', function () {
      it('should approve a valid JSON web token', function (done) {
        const payload = {
          sub: '8e7341ad-cba6-4f6f-8061-88b8b18d3885',
          tid: '719d88f3-f957-44cf-9aa5-0a1a3a44f7b9',
          aud: 'api://25b17cdb-4c8d-434c-9a21-86d67ac501d1'
        }
        getToken(JSON.stringify(payload), (token) => {
          agent
            .get('/oauth/validate')
            .trustLocalhost(true)
            .set('Authorization', 'Bearer ' + token)
            .expect(200)
            .expect(res => {
              assert.equal(res.body.aud, payload.aud)
              assert.equal(res.body.sub, payload.sub)
              assert.equal(res.body.tid, payload.tid)
            })
            // eslint-disable-next-line no-unused-vars
            .end(function (err, res) {
              if (err) {
                return done(err)
              }
              done()
            })
        })
      })
    })

    describe('Failure cases', function () {
      it('should reject request without Authorization', function (done) {
        agent
          .get('/oauth/validate')
          .trustLocalhost(true)
          .expect(401)
          .expect(res => {
            assert.include(res.text, 'provide JWT via Authorization header')
          })
          // eslint-disable-next-line no-unused-vars
          .end(function (err, res) {
            if (err) {
              return done(err)
            }
            done()
          })
      })

      it('should reject malformed web token', function (done) {
        agent
          .get('/oauth/validate')
          .trustLocalhost(true)
          .set('Authorization', 'Bearer notavalidtokenatall')
          .expect(400)
          .expect(res => {
            assert.include(res.text, 'invalid json web token')
          })
          // eslint-disable-next-line no-unused-vars
          .end(function (err, res) {
            if (err) {
              return done(err)
            }
            done()
          })
      })

      it('should reject JWT with missing signature', function (done) {
        getKeyId((keyid) => {
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
          agent
            .get('/oauth/validate')
            .trustLocalhost(true)
            .set('Authorization', 'Bearer ' + token)
            .expect(400)
            .expect(res => {
              assert.include(res.text, 'jwt signature is required')
            })
            // eslint-disable-next-line no-unused-vars
            .end(function (err, res) {
              if (err) {
                return done(err)
              }
              done()
            })
        })
      })

      it('should reject JWT with incorrect algorithm', function (done) {
        const payload = {
          sub: '8e7341ad-cba6-4f6f-8061-88b8b18d3885',
          tid: '719d88f3-f957-44cf-9aa5-0a1a3a44f7b9',
          aud: 'api://25b17cdb-4c8d-434c-9a21-86d67ac501d1'
        }
        forgedToken(JSON.stringify(payload), (token) => {
          agent
            .get('/oauth/validate')
            .trustLocalhost(true)
            .set('Authorization', 'Bearer ' + token)
            .expect(400)
            .expect(res => {
              assert.include(res.text, 'invalid algorithm')
            })
            // eslint-disable-next-line no-unused-vars
            .end(function (err, res) {
              if (err) {
                return done(err)
              }
              done()
            })
        })
      })

      it('should reject JWT header with bad JSON', function (done) {
        agent
          .get('/oauth/validate')
          .trustLocalhost(true)
          .set('Authorization', 'Bearer dGhpc2lzbm90anNvbg.eyJ1c2VyIjogImpvaG4ifQ.')
          .expect(400)
          .expect(res => {
            assert.include(res.text, 'malformed json web token')
          })
          // eslint-disable-next-line no-unused-vars
          .end(function (err, res) {
            if (err) {
              return done(err)
            }
            done()
          })
      })

      it('should reject web token signed by another party', function (done) {
        const token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6Ik1yNS1BVWliZkJpaTdOZDFqQmViYXhib1hXMCIsImtpZCI6Ik1yNS1BVWliZkJpaTdOZDFqQmViYXhib1hXMCJ9.eyJhdWQiOiJhcGk6Ly8yNWIxN2NkYi00YzhkLTQzNGMtOWEyMS04NmQ2N2FjNTAxZDEiLCJpc3MiOiJodHRwczovL3N0cy53aW5kb3dzLm5ldC83MTlkODhmMy1mOTU3LTQ0Y2YtOWFhNS0wYTFhM2E0NGY3YjkvIiwiaWF0IjoxNjQwMDM4OTY2LCJuYmYiOjE2NDAwMzg5NjYsImV4cCI6MTY0MDEyNTY2NiwiYWlvIjoiRTJaZ1lLaStuWnA3NmQ0TDdRc0Y2Zzk1TGF3NUFBPT0iLCJhcHBpZCI6ImYzNjRmZjE3LTllNDItNGY3ZS1iNzAwLTExZTE5YmEyYWM2ZiIsImFwcGlkYWNyIjoiMiIsImlkcCI6Imh0dHBzOi8vc3RzLndpbmRvd3MubmV0LzcxOWQ4OGYzLWY5NTctNDRjZi05YWE1LTBhMWEzYTQ0ZjdiOS8iLCJvaWQiOiI0ZGJkZjQ1MC05NThkLTRjNjQtODhiMi1hYmJhMmU0NmYxZmYiLCJyaCI6IjAuQVN3QTg0aWRjVmY1ejBTYXBRb2FPa1QzdVJmX1pQTkNubjVQdHdBUjRadWlyRzhzQUFBLiIsInJvbGVzIjpbIlBlcmZvcmNlLkNhbGwiXSwic3ViIjoiNGRiZGY0NTAtOTU4ZC00YzY0LTg4YjItYWJiYTJlNDZmMWZmIiwidGlkIjoiNzE5ZDg4ZjMtZjk1Ny00NGNmLTlhYTUtMGExYTNhNDRmN2I5IiwidXRpIjoiNm5XeVVFbjJGMC00OVlVNG02bDBBQSIsInZlciI6IjEuMCJ9.fS2f3IoYxr2VlJd4BCxT4o3ikqdyjJY1AGVRe7-tBWmpZSbyKOAs39WIYReWp5vMShW1JKv_r37bYSMbIHhz0bfKM-OkQELEdOsfVoBbywkXSoxCoGXAj5q1RxuCPUEnX59UlgCNa2_Z6Rc765O9BSz7BbYBlaW2Bh6OIzTywBW2Lyn987PxiewsIECSUCP_v4lY9VsS5PUo3iQgAygQ1qUQQf3FKunZhL8SOYuz-PcGpkZqC9F8FCah3wMbyekfLu5Tjhujg7lL_RiBgQqkRjXc5WZDft0md4j-4zGQDmPCE73NP2Xh-9mkpu8cZFw-lz-wOZ8SXF43yjfpy1CxSQ'
        agent
          .get('/oauth/validate')
          .trustLocalhost(true)
          .set('Authorization', 'Bearer ' + token)
          .expect(400)
          .expect(res => {
            assert.include(res.text, 'Unable to find a signing key')
          })
          // eslint-disable-next-line no-unused-vars
          .end(function (err, res) {
            if (err) {
              return done(err)
            }
            done()
          })
      })

      it('should reject web token with incorrect tid', function (done) {
        const payload = {
          sub: '719d88f3-f957-44cf-9aa5-0a1a3a44f7b9',
          tid: '8e7341ad-cba6-4f6f-8061-88b8b18d3885',
          aud: 'api://25b17cdb-4c8d-434c-9a21-86d67ac501d1'
        }
        getToken(JSON.stringify(payload), (token) => {
          agent
            .get('/oauth/validate')
            .trustLocalhost(true)
            .set('Authorization', 'Bearer ' + token)
            .expect(403)
            .expect(res => {
              assert.include(res.text, 'tid does not match tenant ID')
            })
            // eslint-disable-next-line no-unused-vars
            .end(function (err, res) {
              if (err) {
                return done(err)
              }
              done()
            })
        })
      })
    })
  })

  run()
}, 500)

// connect to jwt.doc:3000 to get a JWT for testing
function getToken (payload, cb) {
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
      cb(data)
    })
  })
  req.on('error', (e) => {
    console.error('getToken error:', e)
  })
  req.write(payload)
  req.end()
}

function base64json (value) {
  const s = Buffer.from(JSON.stringify(value), 'utf-8').toString('base64')
  return s.replace(/=+$/, '');
}

// Forge a token by using the jwt.doc public key as a shared secret, crafting a
// new token whose keyid matches jwt.doc, but changing the algorithm to HS256 in
// the hopes of tricking the verification routine into trusting this token.
function forgedToken (payload, cb) {
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
      cb(token)
    })
  })
  req.on('error', (e) => {
    console.error('forgedToken error:', e)
  })
  req.end()
}

function getKeyId (cb) {
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
      cb(jwks.keys[0].kid)
    })
  })
  req.on('error', (e) => {
    console.error('forgedToken error:', e)
  })
  req.end()
}
