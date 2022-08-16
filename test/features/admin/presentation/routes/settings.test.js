//
// Copyright 2022 Perforce Software
//
import * as fs from 'node:fs'
import { assert } from 'chai'
import { describe, it, run } from 'mocha'
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
  describe('Settings requests', function () {
    describe('Success cases', function () {
      it('should retrieve configuration settings', function (done) {
        // create a test dot.env file every time for repeatability
        const dotenvFile = 'test/test-dot.env'
        fs.writeFileSync(dotenvFile, 'HAS_UNIT_OLD1="oldvalue"')
        getToken('scott', 'tiger').then((webToken) => {
          agent
            .get('/settings')
            .trustLocalhost(true)
            .set('Authorization', 'Bearer ' + webToken)
            .expect(200)
            .expect('Content-Type', /application\/json/)
            .expect(res => {
              assert.equal(Object.keys(res.body).length, 1)
              assert.equal(res.body.HAS_UNIT_OLD1, 'oldvalue')
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

      it('should modify configuration settings', function (done) {
        getToken('scott', 'tiger').then((webToken) => {
          agent
            .post('/settings')
            .trustLocalhost(true)
            .set('Authorization', 'Bearer ' + webToken)
            .send({ HAS_UNIT_NEW1: 'newvalue' })
            .expect(200)
            // eslint-disable-next-line no-unused-vars
            .end(function (err, res) {
              if (err) {
                return done(err)
              }
              done()
            })
        })
      })

      it('should fetch modified settings', function (done) {
        getToken('scott', 'tiger').then((webToken) => {
          agent
            .get('/settings')
            .trustLocalhost(true)
            .set('Authorization', 'Bearer ' + webToken)
            .expect(200)
            .expect('Content-Type', /application\/json/)
            .expect(res => {
              assert.equal(res.body.HAS_UNIT_OLD1, 'oldvalue')
              assert.equal(res.body.HAS_UNIT_NEW1, 'newvalue')
            })
            // eslint-disable-next-line no-unused-vars
            .end(function (err, res) {
              if (err) {
                return done(err)
              }
              // verify new setting not yet applied to environment
              assert.notProperty(process.env, 'HAS_UNIT_NEW1')
              done()
            })
        })
      })

      //
      // To test this properly would need a means of allowing the Node.js
      // server instance to be rebuilt and wrapped by superagent, which is
      // probably more difficult than it's worth for automated testing.
      //
      // it('should apply settings to environment', function (done) {
      //   getToken('scott', 'tiger').then((webToken) => {
      //     agent
      //       .post('/settings/apply')
      //       .trustLocalhost(true)
      //       .set('Authorization', 'Bearer ' + webToken)
      //       .expect(200)
      //       // eslint-disable-next-line no-unused-vars
      //       .end(function (err, res) {
      //         if (err) {
      //           return done(err)
      //         }
      //         // verify setting has _now_ been applied to environment
      //         assert.equal(process.env.HAS_UNIT_NEW1, 'newvalue')
      //         done()
      //       })
      //   })
      // })
    })

    describe('Failure cases', function () {
      it('should reject fetch without Authorization', function (done) {
        agent
          .get('/settings')
          .trustLocalhost(true)
          .expect(401)
          .expect(res => {
            assert.include(res.text, 'Unauthorized')
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
          .get('/settings')
          .trustLocalhost(true)
          .set('Authorization', 'Bearer notavalidtokenatall')
          .expect(500)
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

      it('should reject web token signed by another party', function (done) {
        const token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6Ik1yNS1BVWliZkJpaTdOZDFqQmViYXhib1hXMCIsImtpZCI6Ik1yNS1BVWliZkJpaTdOZDFqQmViYXhib1hXMCJ9.eyJhdWQiOiJhcGk6Ly8yNWIxN2NkYi00YzhkLTQzNGMtOWEyMS04NmQ2N2FjNTAxZDEiLCJpc3MiOiJodHRwczovL3N0cy53aW5kb3dzLm5ldC83MTlkODhmMy1mOTU3LTQ0Y2YtOWFhNS0wYTFhM2E0NGY3YjkvIiwiaWF0IjoxNjQwMDM4OTY2LCJuYmYiOjE2NDAwMzg5NjYsImV4cCI6MTY0MDEyNTY2NiwiYWlvIjoiRTJaZ1lLaStuWnA3NmQ0TDdRc0Y2Zzk1TGF3NUFBPT0iLCJhcHBpZCI6ImYzNjRmZjE3LTllNDItNGY3ZS1iNzAwLTExZTE5YmEyYWM2ZiIsImFwcGlkYWNyIjoiMiIsImlkcCI6Imh0dHBzOi8vc3RzLndpbmRvd3MubmV0LzcxOWQ4OGYzLWY5NTctNDRjZi05YWE1LTBhMWEzYTQ0ZjdiOS8iLCJvaWQiOiI0ZGJkZjQ1MC05NThkLTRjNjQtODhiMi1hYmJhMmU0NmYxZmYiLCJyaCI6IjAuQVN3QTg0aWRjVmY1ejBTYXBRb2FPa1QzdVJmX1pQTkNubjVQdHdBUjRadWlyRzhzQUFBLiIsInJvbGVzIjpbIlBlcmZvcmNlLkNhbGwiXSwic3ViIjoiNGRiZGY0NTAtOTU4ZC00YzY0LTg4YjItYWJiYTJlNDZmMWZmIiwidGlkIjoiNzE5ZDg4ZjMtZjk1Ny00NGNmLTlhYTUtMGExYTNhNDRmN2I5IiwidXRpIjoiNm5XeVVFbjJGMC00OVlVNG02bDBBQSIsInZlciI6IjEuMCJ9.fS2f3IoYxr2VlJd4BCxT4o3ikqdyjJY1AGVRe7-tBWmpZSbyKOAs39WIYReWp5vMShW1JKv_r37bYSMbIHhz0bfKM-OkQELEdOsfVoBbywkXSoxCoGXAj5q1RxuCPUEnX59UlgCNa2_Z6Rc765O9BSz7BbYBlaW2Bh6OIzTywBW2Lyn987PxiewsIECSUCP_v4lY9VsS5PUo3iQgAygQ1qUQQf3FKunZhL8SOYuz-PcGpkZqC9F8FCah3wMbyekfLu5Tjhujg7lL_RiBgQqkRjXc5WZDft0md4j-4zGQDmPCE73NP2Xh-9mkpu8cZFw-lz-wOZ8SXF43yjfpy1CxSQ'
        agent
          .get('/settings')
          .trustLocalhost(true)
          .set('Authorization', 'Bearer ' + token)
          .expect(401)
          .expect(res => {
            assert.include(res.text, 'Unauthorized')
          })
          // eslint-disable-next-line no-unused-vars
          .end(function (err, res) {
            if (err) {
              return done(err)
            }
            done()
          })
      })

      it('should reject request of wrong content-type', function (done) {
        getToken('scott', 'tiger').then((webToken) => {
          agent
            .post('/settings')
            .trustLocalhost(true)
            .set('Authorization', 'Bearer ' + webToken)
            .send('plain text request body')
            .expect(400)
            .expect(res => {
              assert.include(res.text, 'Content-Type must be application/json')
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

function getToken (username, password) {
  return new Promise((resolve, reject) => {
    agent
      .post('/tokens')
      .trustLocalhost(true)
      .send({ grant_type: 'password', username, password })
      .expect(200)
      // eslint-disable-next-line no-unused-vars
      .end(function (err, res) {
        if (err) {
          reject(err)
        } else {
          resolve(res.body.access_token)
        }
      })
  })
}
