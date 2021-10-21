//
// Copyright 2020-2021 Perforce Software
//
import * as fs from 'node:fs'
import { assert } from 'chai'
import { describe, it, run } from 'mocha'
import request from 'supertest'
import minimatch from 'minimatch'
// Load the test environment before the bulk of our code initializes, otherwise
// it will be too late due to the `import` early-binding behavior.
import 'helix-auth-svc/test/env.js'
import app from 'helix-auth-svc/lib/app.js'
import { createServer } from 'helix-auth-svc/lib/server.js'
import container from 'helix-auth-svc/lib/container.js'

// Tests must be run with `mocha --delay --exit` otherwise we do not give the
// server enough time to start up, and the server hangs indefinitely because
// mocha no longer exits after the tests complete.

const settings = container.resolve('settingsRepository')
const server = createServer(app, settings)
const agent = request.agent(server)
//
// Would have used the ca function but that made no difference,
// still rejected with "Error: self signed certificate" in Node.
//
// const ca = fs.readFileSync('certs/ca.crt')
// const agent = request.agent(server).ca(ca)
// const agent = request.agent(server, { ca })

//
// Give the server a chance to start up asynchronously. This works in concert
// with the --delay flag to the mocha command. A timeout of zero is not quite
// sufficient, so this timing is somewhat fragile.
//
setTimeout(function () {
  describe('Client certificates', function () {
    describe('Common Name matching', function () {
      // easier to test the underlying function than to have dozens of certs
      it('should reject non-matching names', function () {
        assert.isFalse(minimatch('LoginExtension', 'TrustedExtension'))
        assert.isFalse(minimatch('LoginExtension', '*Trusted'))
        assert.isFalse(minimatch('LoginExtension', 'Trusted*'))
        assert.isFalse(minimatch('www.example.com', '*.trusted.com'))
        assert.isFalse(minimatch('www.example.com', 'example.*'))
      })

      it('should accept matching names', function () {
        assert.isTrue(minimatch('LoginExtension', 'LoginExtension'))
        assert.isTrue(minimatch('LoginExtension', '*Extension'))
        assert.isTrue(minimatch('LoginExtension', 'Login*'))
        assert.isTrue(minimatch('LoginExtension', 'Login*Extension'))
        assert.isTrue(minimatch('www.example.com', '*.example.com'))
        assert.isTrue(minimatch('www.example.com', 'www.example.*'))
        assert.isTrue(minimatch('www.example.com', 'www.*.com'))
      })
    })
  })

  describe('Login requests', function () {
    let requestId

    describe('request login identifier', function () {
      it('should return a URL', function (done) {
        agent
          .get('/requests/new/fakeuser')
          .trustLocalhost(true)
          .expect(200)
          .expect(res => {
            assert.equal(res.body.request.length, 26)
            assert.isTrue(res.body.loginUrl.startsWith('http'))
            const suffix = `/${res.body.request}?instanceId=none`
            assert.isTrue(res.body.loginUrl.endsWith(suffix))
            assert.isTrue(res.body.baseUrl.startsWith('http'))
            requestId = res.body.request
          })
          // eslint-disable-next-line no-unused-vars
          .end(function (err, res) {
            if (err) {
              return done(err)
            }
            done()
          })
      })

      it('should return a URL with instanceId', function (done) {
        process.env.INSTANCE_ID = 'trueU'
        agent
          .get('/requests/new/realuser')
          .trustLocalhost(true)
          .expect(200)
          .expect(res => {
            assert.equal(res.body.request.length, 26)
            assert.isTrue(res.body.loginUrl.startsWith('http'))
            const suffix = `/${res.body.request}?instanceId=trueU`
            assert.isTrue(res.body.loginUrl.endsWith(suffix))
            assert.isTrue(res.body.baseUrl.startsWith('http'))
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

    describe('request without client certificate', function () {
      it('should reject the request with 401', function (done) {
        agent
          .get('/requests/status/' + requestId)
          .trustLocalhost(true)
          .expect(401)
          // eslint-disable-next-line no-unused-vars
          .end(function (err, res) {
            if (err) {
              return done(err)
            }
            done()
          })
      })
    })

    describe('insert fake user profile', function () {
      // this uses test-only API enabled by setting NODE_ENV to 'automated_tests'
      it('should return success', function (done) {
        agent
          .post('/requests/insert/' + requestId)
          .trustLocalhost(true)
          .send({ name: 'Test User', email: 'test@example.com' })
          .expect(200)
          .expect(res => {
            assert.equal(res.body.status, 'ok')
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

    describe('request with client certificate', function () {
      it('should reject non-matching common name', function (done) {
        const cert2 = fs.readFileSync('test/client2.crt')
        const key2 = fs.readFileSync('test/client2.key')
        agent
          .get('/requests/status/' + requestId)
          .trustLocalhost(true)
          .key(key2)
          .cert(cert2)
          .expect(403)
          // eslint-disable-next-line no-unused-vars
          .end(function (err, res) {
            if (err) {
              return done(err)
            }
            done()
          })
      })

      it('should accept matching common name', function (done) {
        const cert = fs.readFileSync('test/client.crt')
        const key = fs.readFileSync('test/client.key')
        agent
          .get('/requests/status/' + requestId)
          .trustLocalhost(true)
          .key(key)
          .cert(cert)
          .expect(200)
          .expect(res => {
            assert.equal(res.body.name, 'Test User')
            assert.equal(res.body.email, 'test@example.com')
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

  run()
}, 500)
