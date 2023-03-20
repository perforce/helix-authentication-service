//
// Copyright 2023 Perforce Software
//
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
  describe('Multi-Login requests', function () {
    it('should indicate error if no AUTH_PROVIDERS', function (done) {
      agent
        .get('/multi/login/fakereq123')
        .trustLocalhost(true)
        .expect(200, /requires AUTH_PROVIDERS setting/, done)
    })

    it('should return a page with multiple login URLs', function (done) {
      const providers = {
        providers: [
          { label: 'Acme Identity', protocol: 'oidc' },
          { label: 'Federated Enterprises', protocol: 'saml' },
        ]
      }
      settings.set('AUTH_PROVIDERS', JSON.stringify(providers))
      agent
        .get('/multi/login/fakereq123')
        .trustLocalhost(true)
        .expect(200)
        .expect(res => {
          assert.include(res.text, '/oidc/login/fakereq123?provider=oidc')
          assert.include(res.text, '/saml/login/fakereq123?provider=saml')
          assert.include(res.text, 'Acme Identity')
          assert.include(res.text, 'Federated Enterprises')
        })
        .end(done)
    })
  })

  run()
}, 500)
