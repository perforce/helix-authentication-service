//
// Copyright 2023 Perforce Software
//
import * as fs from 'node:fs'
import { assert } from 'chai'
import { beforeEach, describe, it, run } from 'mocha'
import request from 'supertest'
import { minimatch } from 'minimatch'
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
const temporaryRepository = container.resolve('temporaryRepository')
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

    beforeEach(function () {
      temporaryRepository.clear()
    })

    it('should reject no such request with terse response', function (done) {
      const cert = fs.readFileSync('test/client.crt')
      const key = fs.readFileSync('test/client.key')
      agent
        .get('/requests/status/nine3two')
        .trustLocalhost(true)
        .key(key)
        .cert(cert)
        .expect(404, 'no such request', done)
    })

    describe('request login identifier', function () {
      it('should return a URL', function (done) {
        agent
          .get('/requests/new/fakeuser')
          .trustLocalhost(true)
          .expect(200)
          .expect(res => {
            assert.equal(res.body.request.length, 26)
            assert.isTrue(res.body.loginUrl.startsWith('https://localhost:3333/'))
            const suffix = `/${res.body.request}?instanceId=none`
            assert.isTrue(res.body.loginUrl.endsWith(suffix))
            assert.equal(res.body.baseUrl, 'https://localhost:3333')
            assert.isFalse(res.body.forceAuthn)
            assert.equal(res.body.userId, 'fakeuser')
            assert.equal(res.body.instanceId, 'none')
            requestId = res.body.request
          })
          .end(done)
      })

      it('should return a URL with instanceId', function (done) {
        temporaryRepository.set('INSTANCE_ID', 'trueU')
        agent
          .get('/requests/new/realuser')
          .trustLocalhost(true)
          .expect(200)
          .expect(res => {
            assert.equal(res.body.request.length, 26)
            assert.isTrue(res.body.loginUrl.startsWith('https://localhost:3333/'))
            const suffix = `/${res.body.request}?instanceId=trueU`
            assert.isTrue(res.body.loginUrl.endsWith(suffix))
            assert.isFalse(res.body.forceAuthn)
            assert.equal(res.body.userId, 'realuser')
            assert.equal(res.body.instanceId, 'trueU')
          })
          .end(done)
      })

      it('should return a URL with providerId', function (done) {
        // auto-converted SAML provider will have an id of 'saml'
        temporaryRepository.set('SAML_IDP_SSO_URL', 'https://saml.example.com/signon')
        agent
          .get('/requests/new/realuser?providerId=saml')
          .trustLocalhost(true)
          .expect(200)
          .expect(res => {
            assert.include(res.body.loginUrl, '&providerId=saml')
          })
          .end(done)
      })

      it('should return multi URL with unknown providerId', function (done) {
        agent
          .get('/requests/new/realuser?providerId=foobar')
          .trustLocalhost(true)
          .expect(200)
          .expect(res => {
            assert.include(res.body.loginUrl, '/multi/login/')
          })
          .end(done)
      })

      it('should forceAuthn using query parameter', function (done) {
        agent
          .get('/requests/new/forceq')
          .trustLocalhost(true)
          .query({ forceAuthn: 'yes' })
          .expect(200)
          .expect(res => {
            assert.isTrue(res.body.forceAuthn)
          })
          .end(done)
      })

      it('should forceAuthn using environment variable', function (done) {
        temporaryRepository.set('FORCE_AUTHN', 'true')
        agent
          .get('/requests/new/forceq')
          .trustLocalhost(true)
          .expect(200)
          .expect(res => {
            assert.isTrue(res.body.forceAuthn)
          })
          .end(done)
      })

      it('should ignore forceAuthn setting in provider', function (done) {
        temporaryRepository.set('AUTH_PROVIDERS', [
          {
            label: 'Acme Security',
            protocol: 'saml',
            metadataUrl: 'https://saml.example.com',
            forceAuthn: true
          }
        ])
        agent
          .get('/requests/new/forceq?providerId=saml-0')
          .trustLocalhost(true)
          .expect(200)
          .expect(res => {
            assert.isFalse(res.body.forceAuthn)
          })
          .end(done)
      })
    })

    describe('request without client certificate', function () {
      it('should reject the request with 401', function (done) {
        agent
          .get('/requests/status/' + requestId)
          .trustLocalhost(true)
          .expect(401, done)
      })
    })

    describe('insert fake user profile', function () {
      // this uses test-only API enabled by setting NODE_ENV to 'automated_tests'
      it('should return success', function (done) {
        agent
          .post('/requests/insert/' + requestId)
          .trustLocalhost(true)
          .send({ name: 'Test User', email: 'test@example.com' })
          .expect(200, { status: 'ok' }, done)
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
          .expect(403, done)
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
          .end(done)
      })
    })
  })

  run()
}, 500)
