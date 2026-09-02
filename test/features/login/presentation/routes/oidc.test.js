//
// Copyright 2026 Perforce Software
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
const app = await createApp()
const server = createServer(app, settings)
const agent = request.agent(server)
const startRequest = container.resolve('startRequest')
const redisConnector = await container.resolve('redisConnector')

//
// Give the server a chance to start up asynchronously. This works in concert
// with the --delay flag to the mocha command. A timeout of zero is not quite
// sufficient, so this timing is somewhat fragile.
//
setTimeout(function () {
  describe('OIDC callback cross-instance recovery (HAS-707)', function () {
    it('should not silently give up when this instance never saw /oidc/login', function (done) {
      // Simulate a login request that legitimately exists (as it would via
      // Redis, visible to every instance) but whose OIDC-specific pending
      // state (the codeVerifier/provider, normally recorded only in the
      // memory of whichever instance handled /oidc/login) was recorded by a
      // *different* instance than the one now handling /oidc/callback --
      // exactly what happens behind a load balancer with no session affinity
      // (HAS-707). This never goes through GET /oidc/login/:id, so this
      // instance's local pendingLogins Map has no entry for it.
      const requestModel = startRequest('someone@example.com', false)
      const requestId = requestModel.id
      // Seed only the recovery record (as prepareLogin/performAuthentication
      // would have on the *other* instance), using the same key format
      // oidc.js's own persistRecoveryRecord() uses.
      redisConnector.set('oidc-' + requestId, JSON.stringify({
        providerId: 'openidconnect',
        codeVerifier: 'fake-code-verifier-value'
      }))
      agent
        .get(`/oidc/callback?state=${requestId}&code=fakecode`)
        .trustLocalhost(true)
        .expect(302)
        .expect((res) => {
          // Before the fix: ensurePendingLogin() only checks the local
          // pendingLogins Map, finds nothing, and gives up silently by
          // redirecting to '/' -- indistinguishable from "no such login at
          // all" even though the login is legitimately pending.
          //
          // After the fix: ensurePendingLogin() finds the recovery record
          // and lets the request through; handleCallback() then attempts to
          // rebuild the pending login (which, with no OIDC provider
          // configured in this test environment, fails for an unrelated
          // reason) and redirects to /oidc/login_failed instead -- proving
          // recovery was actually attempted rather than given up on early.
          assert.include(res.headers.location, '/oidc/login_failed')
        })
        .end(done)
    })
  })
  run()
}, 0)
