//
// Copyright 2023 Perforce Software
//
import { assert } from 'chai'
import { after, before, describe, it, run } from 'mocha'
import request from 'supertest'
import * as helpers from 'helix-auth-svc/test/helpers.js'
import * as runner from 'helix-auth-svc/test/runner.js'
// Load the test environment before the bulk of our code initializes, otherwise
// it will be too late due to the `import` early-binding behavior.
import 'helix-auth-svc/test/env.js'
import createApp from 'helix-auth-svc/lib/app.js'
import { createServer } from 'helix-auth-svc/lib/server.js'
import {
  default as container,
  registerLateBindings
} from 'helix-auth-svc/lib/container.js'
import p4pkg from 'p4api'
const { P4 } = p4pkg

// Tests must be run with `mocha --delay --exit` otherwise we do not give the
// server enough time to start up, and the server hangs indefinitely because
// mocha no longer exits after the tests complete.

const settings = container.resolve('settingsRepository')
const app = createApp()
const server = createServer(app, settings)
const agent = request.agent(server)
const authToken = 'Bearer ZGFuZ2VyIG1vdXNl'

setTimeout(function () {
  describe('User provisioning', function () {
    let p4config

    before(async function () {
      // this test requires p4d which is not included in the "unit" test environment
      if (process.env.UNIT_ONLY) {
        this.skip()
      } else {
        this.timeout(30000)
        p4config = await runner.startServer('./tmp/p4d/provisioning')
        helpers.establishSuper(p4config)
        settings.set('P4PORT', p4config.port)
        settings.set('P4USER', p4config.user)
        settings.set('P4PASSWD', p4config.password)
        settings.set('P4TICKETS', p4config.tickets)
        settings.set('ALLOW_USER_RENAME', true)
        await registerLateBindings()
      }
    })

    after(async function () {
      this.timeout(30000)
      await runner.stopServer(p4config)
    })

    describe('Add, rename, deactivate', function () {
      it('should create a user via POST', function (done) {
        agent
          .post('/scim/v2/Users')
          .trustLocalhost(true)
          .set('Authorization', authToken)
          .send({
            schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
            userName: 'pparker@example.com',
            name: { familyName: 'Parker', givenName: 'Peter' },
            emails: [{ primary: true, type: 'work', value: 'pparker@example.com' }],
            displayName: 'Peter Parker',
            locale: 'en-US',
            externalId: '00udud1rtaDsrJ5rb5d7',
            groups: [],
            password: 'iamSp!derm4n',
            active: true
          })
          .expect('Content-Type', /application\/scim\+json/)
          .expect('Location', /\/scim\/v2\/Users\/user-pparker/)
          .expect(201)
          .expect(res => {
            assert.include(res.body.schemas, 'urn:ietf:params:scim:schemas:core:2.0:User')
            assert.equal(res.body.userName, 'pparker@example.com')
            assert.equal(res.body.displayName, 'Peter Parker')
            assert.lengthOf(res.body.emails, 1)
            assert.equal(res.body.emails[0].value, 'pparker@example.com')
            assert.isTrue(res.body.active)
          })
          .end(done)
      })

      // TODO: Okta SCIM client does first GET on the user
      // TODO: Okta SCIM client does a PUT with a new password
      // TODO: Okta SCIM client does second GET on the user

      it('should rename user via PUT', function (done) {
        agent
          .put('/scim/v2/Users/user-pparker')
          .trustLocalhost(true)
          .set('Authorization', authToken)
          .send({
            schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
            id: 'user-pparker',
            externalId: '00udud1rtaDsrJ5rb5d7',
            userName: 'peteparker@example.com',
            displayName: 'Peter Parker',
            name: { formatted: 'Peter Parker', givenName: 'Peter', familyName: 'Parker' },
            emails: [{ primary: true, value: 'pparker@example.com', type: 'work' }],
            active: true,
            locale: 'en-US',
            groups: []
          })
          .expect('Content-Type', /application\/scim\+json/)
          .expect(200)
          .expect(res => {
            assert.include(res.body.schemas, 'urn:ietf:params:scim:schemas:core:2.0:User')
            assert.equal(res.body.userName, 'peteparker@example.com')
            assert.equal(res.body.displayName, 'Peter Parker')
            assert.lengthOf(res.body.emails, 1)
            assert.equal(res.body.emails[0].value, 'pparker@example.com')
            assert.isTrue(res.body.active)
          })
          .end(done)
      })

      it('should return 404 for old user name', function (done) {
        agent
          .get('/scim/v2/Users/user-pparker')
          .trustLocalhost(true)
          .set('Authorization', authToken)
          .expect('Content-Type', /application\/scim\+json/)
          .expect(404)
          .expect(res => {
            assert.equal(res.body.status, '404')
            assert.include(res.body.schemas, 'urn:ietf:params:scim:api:messages:2.0:Error')
            assert.equal(res.body.detail, 'Resource user-pparker not found')
          })
          .end(done)
      })

      it('should deactivate user via PUT', function (done) {
        agent
          .put('/scim/v2/Users/user-peteparker')
          .trustLocalhost(true)
          .set('Authorization', authToken)
          .send({
            schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
            id: 'user-peteparker',
            externalId: '00udud1rtaDsrJ5rb5d7',
            userName: 'peteparker@example.com',
            displayName: 'Peter Parker',
            name: { formatted: 'Peter Parker', givenName: 'Peter', familyName: 'Parker' },
            emails: [{ primary: true, value: 'pparker@example.com', type: 'work' }],
            active: false
          })
          .expect('Content-Type', /application\/scim\+json/)
          .expect(200)
          .expect(res => {
            assert.include(res.body.schemas, 'urn:ietf:params:scim:schemas:core:2.0:User')
            assert.equal(res.body.userName, 'peteparker@example.com')
            assert.equal(res.body.displayName, 'Peter Parker')
            assert.lengthOf(res.body.emails, 1)
            assert.equal(res.body.emails[0].value, 'pparker@example.com')
            assert.isFalse(res.body.active)
          })
          .end(done)
      })

      it('should have marked user as inactive in p4', async function () {
        const p4 = new P4({
          P4PORT: p4config.port,
          P4USER: p4config.user,
          P4TICKETS: p4config.tickets,
          P4TRUST: p4config.trust
        })
        const loginCmd = await p4.cmd('login', 'p8ssword')
        assert.equal(loginCmd.stat[0].TicketExpiration, '43200')
        const keysOut = await p4.cmd('keys')
        assert.lengthOf(keysOut.stat, 1)
        assert.equal(keysOut.stat[0].key, 'scim-user-peteparker')
        assert.include(keysOut.stat[0].value, '"active":false')
      })
    })
  })

  run()
}, 500)
