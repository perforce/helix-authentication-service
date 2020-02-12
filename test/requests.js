//
// Copyright 2020 Perforce Software
//
const fs = require('fs')
const { assert } = require('chai')
const { describe, it, run } = require('mocha')
const request = require('supertest')
const minimatch = require('minimatch')

// Tests must be run with `mocha --delay --exit` otherwise we do not give the
// server enough time to start up, and the server hangs indefinitely because
// mocha no longer exits after the tests complete.

// To get trustLocalhost() we need to lock supertest at version 4.0.0, since
// after that release they downgraded the included superagent, which is where
// those functions come from. Wasted a lot of time only to find out that all of
// their documentation was out of date.

// Override any existing .env file by loading our test configuration.
require('dotenv').config({ path: 'test/dot.env' })

// start the server
const app = require('../lib/app')
const { createServer } = require('../lib/server')
const server = createServer(app)
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
    describe('common name matching', function () {
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
            assert.isTrue(res.body.loginUrl.endsWith(res.body.request))
            assert.isTrue(res.body.baseUrl.startsWith('http'))
            requestId = res.body.request
          })
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
          .end(function (err, res) {
            if (err) {
              return done(err)
            }
            done()
          })
      })
    })

    describe('insert fake user profile', function () {
      // this uses test-only API enabled by setting NODE_ENV to 'test'
      it('should return success', function (done) {
        agent
          .post('/requests/insert/' + requestId)
          .trustLocalhost(true)
          .send({ name: 'Test User', email: 'test@example.com' })
          .expect(200)
          .expect(res => {
            assert.equal(res.body.status, 'ok')
          })
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
