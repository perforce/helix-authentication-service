//
// Copyright 2024 Perforce Software
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
import { GroupModel } from 'helix-auth-svc/lib/features/scim/data/models/GroupModel.js'
import p4pkg from 'p4api'
const { P4 } = p4pkg

// Tests must be run with `mocha --delay --exit` otherwise we do not give the
// server enough time to start up, and the server hangs indefinitely because
// mocha no longer exits after the tests complete.

const settings = container.resolve('settingsRepository')
const app = createApp()
const server = createServer(app, settings)
const agent = request.agent(server)

setTimeout(function () {
  describe('User provisioning', function () {

    describe('Single server', function () {
      const authToken = 'Bearer ZGFuZ2VyIG1vdXNl'
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
        if (process.env.UNIT_ONLY === undefined) {
          this.timeout(30000)
          await runner.stopServer(p4config)
        }
      })

      describe('Add, rename, deactivate', function () {
        it('should create a user via POST', function (done) {
          this.timeout(10000)
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
          this.timeout(10000)
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
          this.timeout(10000)
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
          this.timeout(10000)
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
          this.timeout(10000)
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

    describe('Single-server w/SSL', function () {
      const authToken = 'Bearer ZGFuZ2VyIG1vdXNl'
      let p4config

      before(async function () {
        // this test requires p4d which is not included in the "unit" test environment
        if (process.env.UNIT_ONLY) {
          this.skip()
        } else {
          this.timeout(30000)
          p4config = await runner.startSslServer('./tmp/p4d/ssl_provisioning')
          helpers.establishTrust(p4config)
          helpers.establishSuper(p4config)
          // remove the trust so taht the service is forced to establish trust again
          helpers.demolishTrust(p4config)
          settings.set('P4PORT', p4config.port)
          settings.set('P4USER', p4config.user)
          settings.set('P4PASSWD', p4config.password)
          settings.set('P4TICKETS', p4config.tickets)
          settings.set('P4TRUST', p4config.trust)
          settings.set('ALLOW_USER_RENAME', true)
          await registerLateBindings()
        }
      })

      after(async function () {
        if (process.env.UNIT_ONLY === undefined) {
          this.timeout(30000)
          await runner.stopServer(p4config)
        }
      })

      describe('Add and retrieve user', function () {
        it('should create a user via POST', function (done) {
          this.timeout(10000)
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
              externalId: '00udud1rtaDsrJ5rb5d7ssl',
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

        it('should GET user', function (done) {
          this.timeout(10000)
          agent
            .get('/scim/v2/Users/user-pparker')
            .trustLocalhost(true)
            .set('Authorization', authToken)
            .expect('Content-Type', /application\/scim\+json/)
            .expect('Location', /\/scim\/v2\/Users\/user-pparker/)
            .expect(200)
            .expect(res => {
              assert.include(res.body.schemas, 'urn:ietf:params:scim:schemas:core:2.0:User')
              assert.equal(res.body.userName, 'pparker@example.com')
              assert.equal(res.body.displayName, 'Peter Parker')
              assert.lengthOf(res.body.emails, 1)
              assert.equal(res.body.emails[0].value, 'pparker@example.com')
              assert.isTrue(res.body.active)
              assert.equal(res.body.externalId, '00udud1rtaDsrJ5rb5d7ssl')
            })
            .end(done)
        })
      })

      describe('Create groups like a real client would', function () {
        // 1. create an empty group
        // 2. create users that will be added to the group
        // 3. patch the group for each user to be added
        it('should POST group with no members', function (done) {
          this.timeout(10000)
          agent
            .post('/scim/v2/Groups')
            .trustLocalhost(true)
            .set('Authorization', authToken)
            .send({
              schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
              externalId: 'AC838315-F57A-4C58-9C6F-94B37B651FA6',
              displayName: 'HasMembers',
              members: []
            })
            .expect('Content-Type', /application\/scim\+json/)
            .expect('Location', /\/scim\/v2\/Groups\/group-HasMembers/)
            .expect(201)
            .expect(res => {
              assert.include(res.body.schemas, 'urn:ietf:params:scim:schemas:core:2.0:Group')
              assert.equal(res.body.displayName, 'HasMembers')
              assert.equal(res.body.externalId, 'AC838315-F57A-4C58-9C6F-94B37B651FA6')
              assert.lengthOf(res.body.members, 0)
            })
            .end(done)
        })

        it('should create first user via POST', function (done) {
          this.timeout(10000)
          agent
            .post('/scim/v2/Users')
            .trustLocalhost(true)
            .set('Authorization', authToken)
            .send({
              schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
              userName: 'samjackson@example.com',
              name: { familyName: 'Jackson', givenName: 'Samuel' },
              emails: [{ primary: true, type: 'work', value: 'samjackson@example.com' }],
              displayName: 'Samuel Jackson',
              locale: 'en-US',
              externalId: '261F3136-C5D0-4895-B63A-7A34CB416CC2',
              groups: [],
              password: 'SAMLisAw3s0m3!',
              active: true
            })
            .expect('Content-Type', /application\/scim\+json/)
            .expect('Location', /\/scim\/v2\/Users\/user-samjackson/)
            .expect(201)
            .expect(res => {
              assert.include(res.body.schemas, 'urn:ietf:params:scim:schemas:core:2.0:User')
              assert.equal(res.body.userName, 'samjackson@example.com')
              assert.equal(res.body.displayName, 'Samuel Jackson')
              assert.lengthOf(res.body.emails, 1)
              assert.equal(res.body.emails[0].value, 'samjackson@example.com')
              assert.isTrue(res.body.active)
            })
            .end(done)
        })

        it('should create second user via POST', function (done) {
          this.timeout(10000)
          agent
            .post('/scim/v2/Users')
            .trustLocalhost(true)
            .set('Authorization', authToken)
            .send({
              schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
              userName: 'openeyedee@example.com',
              name: { familyName: 'Deedee', givenName: 'Openeye' },
              emails: [{ primary: true, type: 'work', value: 'openeyedee@example.com' }],
              displayName: 'Openeye Deedee',
              locale: 'en-US',
              externalId: '7FD39E71-3180-409B-B2FC-715B4E69C0C5',
              groups: [],
              password: 'OIDCisAw3s0m3!',
              active: true
            })
            .expect('Content-Type', /application\/scim\+json/)
            .expect('Location', /\/scim\/v2\/Users\/user-openeyedee/)
            .expect(201)
            .expect(res => {
              assert.include(res.body.schemas, 'urn:ietf:params:scim:schemas:core:2.0:User')
              assert.equal(res.body.userName, 'openeyedee@example.com')
              assert.equal(res.body.displayName, 'Openeye Deedee')
              assert.lengthOf(res.body.emails, 1)
              assert.equal(res.body.emails[0].value, 'openeyedee@example.com')
              assert.isTrue(res.body.active)
            })
            .end(done)
        })

        it('should PATCH first user into group', function (done) {
          this.timeout(10000)
          agent
            .patch('/scim/v2/Groups/HasMembers')
            .trustLocalhost(true)
            .set('Authorization', authToken)
            .send({
              schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
              Operations: [{
                op: "Add",
                path: "members",
                value: [{ value: "user-samjackson" }]
              }],
            })
            .expect('Content-Type', /application\/scim\+json/)
            .expect('Location', /\/scim\/v2\/Groups\/group-HasMembers/)
            .expect(200)
            .expect(res => {
              assert.include(res.body.schemas, 'urn:ietf:params:scim:schemas:core:2.0:Group')
              assert.equal(res.body.displayName, 'HasMembers')
              assert.lengthOf(res.body.members, 1)
              assert.equal(res.body.members[0].value, 'user-samjackson')
              assert.match(res.body.members[0].$ref, /\/scim\/v2\/Users\/user-samjackson/)
              assert.exists(res.body.meta.created)
              assert.exists(res.body.meta.lastModified)
              assert.equal(res.body.meta.resourceType, 'Group')
              assert.match(res.body.meta.location, /\/scim\/v2\/Groups\/group-HasMembers/)
            })
            .end(done)
        })

        it('should PATCH second user into group', function (done) {
          this.timeout(10000)
          agent
            .patch('/scim/v2/Groups/HasMembers')
            .trustLocalhost(true)
            .set('Authorization', authToken)
            .send({
              schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
              Operations: [{
                op: "Add",
                path: "members",
                value: [{ value: "user-openeyedee" }]
              }],
            })
            .expect('Content-Type', /application\/scim\+json/)
            .expect('Location', /\/scim\/v2\/Groups\/group-HasMembers/)
            .expect(200)
            .expect(res => {
              assert.include(res.body.schemas, 'urn:ietf:params:scim:schemas:core:2.0:Group')
              assert.equal(res.body.displayName, 'HasMembers')
              assert.lengthOf(res.body.members, 2)
              assert.equal(res.body.members[0].value, 'user-samjackson')
              assert.equal(res.body.members[1].value, 'user-openeyedee')
            })
            .end((err) => {
              if (err) {
                done(err)
              } else {
                // verify p4 group properties
                const p4 = new P4({
                  P4PORT: p4config.port,
                  P4USER: p4config.user,
                  P4TICKETS: p4config.tickets,
                  P4TRUST: p4config.trust
                })
                const groupOut = p4.cmdSync('group -o HasMembers')
                assert.equal(groupOut.stat[0].Owners0, 'bruno')
                const group = GroupModel.fromSpec(groupOut.stat[0])
                assert.isOk(group.members.find((e) => e.value === 'user-samjackson'))
                assert.isOk(group.members.find((e) => e.value === 'user-openeyedee'))
                done()
              }
            })
        })
      })
    })

    describe('Multiple servers', function () {
      const authTokenF = 'Bearer a2V5Ym9hcmQgY2F0'
      const authTokenB = 'Bearer c3VyZmluZyBib2Fy'
      let p4config

      before(async function () {
        // this test requires p4d which is not included in the "unit" test environment
        if (process.env.UNIT_ONLY) {
          this.skip()
        } else {
          this.timeout(30000)
          p4config = await runner.startServer('./tmp/p4d/multi-scim')
          helpers.establishSuper(p4config)
          settings.set('PROVISIONING', {
            providers: [
              { bearerToken: 'keyboard cat', domain: 'feline' },
              { bearerToken: 'surfing boar', domain: 'bovine' }
            ],
            servers: [{
              p4port: p4config.port,
              p4user: p4config.user,
              p4passwd: p4config.password,
              domains: ['feline', 'bovine'],
              p4tickets: p4config.tickets
            }]
          })
          await registerLateBindings()
        }
      })

      after(async function () {
        if (process.env.UNIT_ONLY === undefined) {
          this.timeout(30000)
          await runner.stopServer(p4config)
        }
      })

      describe('Manage users and their externalId', function () {
        it('should POST user from feline domain', function (done) {
          this.timeout(10000)
          agent
            .post('/scim/v2/Users')
            .trustLocalhost(true)
            .set('Authorization', authTokenF)
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

        it('should GET user for feline domain', function (done) {
          this.timeout(10000)
          agent
            .get('/scim/v2/Users/user-pparker')
            .trustLocalhost(true)
            .set('Authorization', authTokenF)
            .expect('Content-Type', /application\/scim\+json/)
            .expect('Location', /\/scim\/v2\/Users\/user-pparker/)
            .expect(200)
            .expect(res => {
              assert.include(res.body.schemas, 'urn:ietf:params:scim:schemas:core:2.0:User')
              assert.equal(res.body.userName, 'pparker@example.com')
              assert.equal(res.body.displayName, 'Peter Parker')
              assert.lengthOf(res.body.emails, 1)
              assert.equal(res.body.emails[0].value, 'pparker@example.com')
              assert.isTrue(res.body.active)
              assert.equal(res.body.externalId, '00udud1rtaDsrJ5rb5d7')
            })
            .end(done)
        })

        it('should GET user for bovine domain', function (done) {
          this.timeout(10000)
          agent
            .get('/scim/v2/Users/user-pparker')
            .trustLocalhost(true)
            .set('Authorization', authTokenB)
            .expect('Content-Type', /application\/scim\+json/)
            .expect('Location', /\/scim\/v2\/Users\/user-pparker/)
            .expect(200)
            .expect(res => {
              assert.include(res.body.schemas, 'urn:ietf:params:scim:schemas:core:2.0:User')
              assert.equal(res.body.userName, 'pparker@example.com')
              assert.equal(res.body.displayName, 'Peter Parker')
              assert.lengthOf(res.body.emails, 1)
              assert.equal(res.body.emails[0].value, 'pparker@example.com')
              assert.isTrue(res.body.active)
              assert.isUndefined(res.body.externalId)
            })
            .end(done)
        })

        it('should PATCH user externalId for bovine domain', function (done) {
          this.timeout(10000)
          agent
            .patch('/scim/v2/Users/user-pparker')
            .trustLocalhost(true)
            .set('Authorization', authTokenB)
            .send({
              schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
              Operations: [
                {
                  op: 'add',
                  path: 'externalId',
                  value: '01hhmwt25stwkkv8kdbvvrt9a5'
                }
              ]
            })
            .expect('Content-Type', /application\/scim\+json/)
            .expect(200)
            .expect(res => {
              assert.include(res.body.schemas, 'urn:ietf:params:scim:schemas:core:2.0:User')
              assert.equal(res.body.userName, 'pparker@example.com')
              assert.equal(res.body.displayName, 'Peter Parker')
              assert.lengthOf(res.body.emails, 1)
              assert.equal(res.body.emails[0].value, 'pparker@example.com')
              assert.isTrue(res.body.active)
              assert.equal(res.body.externalId, '01hhmwt25stwkkv8kdbvvrt9a5')
            })
            .end(done)
        })

        it('should GET user for bovine domain', function (done) {
          this.timeout(10000)
          agent
            .get('/scim/v2/Users/user-pparker')
            .trustLocalhost(true)
            .set('Authorization', authTokenB)
            .expect('Content-Type', /application\/scim\+json/)
            .expect('Location', /\/scim\/v2\/Users\/user-pparker/)
            .expect(200)
            .expect(res => {
              assert.include(res.body.schemas, 'urn:ietf:params:scim:schemas:core:2.0:User')
              assert.equal(res.body.userName, 'pparker@example.com')
              assert.equal(res.body.displayName, 'Peter Parker')
              assert.lengthOf(res.body.emails, 1)
              assert.equal(res.body.emails[0].value, 'pparker@example.com')
              assert.isTrue(res.body.active)
              assert.equal(res.body.externalId, '01hhmwt25stwkkv8kdbvvrt9a5')
            })
            .end(done)
        })

        it('should PUT updated user from feline domain', function (done) {
          this.timeout(10000)
          agent
            .put('/scim/v2/Users/user-pparker')
            .trustLocalhost(true)
            .set('Authorization', authTokenF)
            .send({
              schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
              userName: 'pparker@example.com',
              name: { familyName: 'Parker', givenName: 'Peter' },
              emails: [{ primary: true, type: 'work', value: 'pparker@example.com' }],
              displayName: 'Peter Parker',
              locale: 'en-US',
              externalId: '01ce1qd7qzzb3fr3vkdy0y5e5m',
              active: true
            })
            .expect('Content-Type', /application\/scim\+json/)
            .expect('Location', /\/scim\/v2\/Users\/user-pparker/)
            .expect(200)
            .expect(res => {
              assert.include(res.body.schemas, 'urn:ietf:params:scim:schemas:core:2.0:User')
              assert.equal(res.body.userName, 'pparker@example.com')
              assert.equal(res.body.displayName, 'Peter Parker')
              assert.lengthOf(res.body.emails, 1)
              assert.equal(res.body.emails[0].value, 'pparker@example.com')
              assert.isTrue(res.body.active)
              assert.equal(res.body.externalId, '01ce1qd7qzzb3fr3vkdy0y5e5m')
            })
            .end(done)
        })

        it('should GET (unchanged) user for bovine domain', function (done) {
          this.timeout(10000)
          agent
            .get('/scim/v2/Users/user-pparker')
            .trustLocalhost(true)
            .set('Authorization', authTokenB)
            .expect('Content-Type', /application\/scim\+json/)
            .expect('Location', /\/scim\/v2\/Users\/user-pparker/)
            .expect(200)
            .expect(res => {
              assert.include(res.body.schemas, 'urn:ietf:params:scim:schemas:core:2.0:User')
              assert.equal(res.body.userName, 'pparker@example.com')
              assert.equal(res.body.displayName, 'Peter Parker')
              assert.lengthOf(res.body.emails, 1)
              assert.equal(res.body.emails[0].value, 'pparker@example.com')
              assert.isTrue(res.body.active)
              assert.equal(res.body.externalId, '01hhmwt25stwkkv8kdbvvrt9a5')
            })
            .end(done)
        })

        it('should GET users for feline domain', function (done) {
          this.timeout(10000)
          agent
            .get('/scim/v2/Users')
            .trustLocalhost(true)
            .set('Authorization', authTokenF)
            .query({ filter: 'emails[value eq "pparker@example.com"]' })
            .expect('Content-Type', /application\/scim\+json/)
            .expect(200)
            .expect(res => {
              assert.equal(res.body.totalResults, 1)
              assert.include(res.body.schemas, 'urn:ietf:params:scim:api:messages:2.0:ListResponse')
              assert.lengthOf(res.body.Resources, 1)
              assert.equal(res.body.Resources[0].userName, 'pparker@example.com')
              assert.equal(res.body.Resources[0].externalId, '01ce1qd7qzzb3fr3vkdy0y5e5m')
            })
            .end(done)
        })

        it('should GET users for bovine domain', function (done) {
          this.timeout(10000)
          agent
            .get('/scim/v2/Users')
            .trustLocalhost(true)
            .set('Authorization', authTokenB)
            .query({ filter: 'emails[value eq "pparker@example.com"]' })
            .expect('Content-Type', /application\/scim\+json/)
            .expect(200)
            .expect(res => {
              assert.equal(res.body.totalResults, 1)
              assert.include(res.body.schemas, 'urn:ietf:params:scim:api:messages:2.0:ListResponse')
              assert.lengthOf(res.body.Resources, 1)
              assert.equal(res.body.Resources[0].userName, 'pparker@example.com')
              assert.equal(res.body.Resources[0].externalId, '01hhmwt25stwkkv8kdbvvrt9a5')
            })
            .end(done)
        })
      })

      describe('Manage groups and their externalId', function () {
        it('should POST group from feline domain', function (done) {
          this.timeout(10000)
          agent
            .post('/scim/v2/Groups')
            .trustLocalhost(true)
            .set('Authorization', authTokenF)
            .send({
              schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
              externalId: '95a6875a-a187-4d60-8fef-3ceb574fce58',
              displayName: 'Managers',
              members: []
            })
            .expect('Content-Type', /application\/scim\+json/)
            .expect('Location', /\/scim\/v2\/Groups\/group-Managers/)
            .expect(201)
            .expect(res => {
              assert.include(res.body.schemas, 'urn:ietf:params:scim:schemas:core:2.0:Group')
              assert.equal(res.body.displayName, 'Managers')
              assert.equal(res.body.externalId, '95a6875a-a187-4d60-8fef-3ceb574fce58')
              assert.lengthOf(res.body.members, 0)
            })
            .end(done)
        })

        it('should GET group for feline domain', function (done) {
          this.timeout(10000)
          agent
            .get('/scim/v2/Groups/group-Managers')
            .trustLocalhost(true)
            .set('Authorization', authTokenF)
            .expect('Content-Type', /application\/scim\+json/)
            .expect('Location', /\/scim\/v2\/Groups\/group-Managers/)
            .expect(200)
            .expect(res => {
              assert.include(res.body.schemas, 'urn:ietf:params:scim:schemas:core:2.0:Group')
              assert.equal(res.body.displayName, 'Managers')
              assert.equal(res.body.externalId, '95a6875a-a187-4d60-8fef-3ceb574fce58')
              assert.lengthOf(res.body.members, 0)
            })
            .end(done)
        })

        it('should GET group for bovine domain', function (done) {
          this.timeout(10000)
          agent
            .get('/scim/v2/Groups/group-Managers')
            .trustLocalhost(true)
            .set('Authorization', authTokenB)
            .expect('Content-Type', /application\/scim\+json/)
            .expect('Location', /\/scim\/v2\/Groups\/group-Managers/)
            .expect(200)
            .expect(res => {
              assert.include(res.body.schemas, 'urn:ietf:params:scim:schemas:core:2.0:Group')
              assert.equal(res.body.displayName, 'Managers')
              assert.isUndefined(res.body.externalId)
              assert.lengthOf(res.body.members, 0)
            })
            .end(done)
        })

        it('should PATCH group externalId for bovine domain', function (done) {
          this.timeout(10000)
          agent
            .patch('/scim/v2/Groups/group-Managers')
            .trustLocalhost(true)
            .set('Authorization', authTokenB)
            .send({
              schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
              Operations: [
                {
                  op: 'add',
                  path: 'externalId',
                  value: 'AD7BFFD4-22EA-488D-AEEB-9A14C0802CF2'
                }
              ]
            })
            .expect('Content-Type', /application\/scim\+json/)
            .expect(200)
            .expect(res => {
              assert.include(res.body.schemas, 'urn:ietf:params:scim:schemas:core:2.0:Group')
              assert.equal(res.body.displayName, 'Managers')
              assert.equal(res.body.externalId, 'AD7BFFD4-22EA-488D-AEEB-9A14C0802CF2')
              assert.lengthOf(res.body.members, 0)
            })
            .end(done)
        })

        it('should GET group for bovine domain', function (done) {
          this.timeout(10000)
          agent
            .get('/scim/v2/Groups/group-Managers')
            .trustLocalhost(true)
            .set('Authorization', authTokenB)
            .expect('Content-Type', /application\/scim\+json/)
            .expect('Location', /\/scim\/v2\/Groups\/group-Managers/)
            .expect(200)
            .expect(res => {
              assert.include(res.body.schemas, 'urn:ietf:params:scim:schemas:core:2.0:Group')
              assert.equal(res.body.displayName, 'Managers')
              assert.equal(res.body.externalId, 'AD7BFFD4-22EA-488D-AEEB-9A14C0802CF2')
              assert.lengthOf(res.body.members, 0)
            })
            .end(done)
        })

        it('should PUT updated group from feline domain', function (done) {
          this.timeout(10000)
          agent
            .put('/scim/v2/Groups/group-Managers')
            .trustLocalhost(true)
            .set('Authorization', authTokenF)
            .send({
              schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
              externalId: 'b2b3fe70-1f1b-41d2-8b0b-47d37c068b42',
              displayName: 'Managers',
              members: []
            })
            .expect('Content-Type', /application\/scim\+json/)
            .expect('Location', /\/scim\/v2\/Groups\/group-Managers/)
            .expect(200)
            .expect(res => {
              assert.include(res.body.schemas, 'urn:ietf:params:scim:schemas:core:2.0:Group')
              assert.equal(res.body.displayName, 'Managers')
              assert.equal(res.body.externalId, 'b2b3fe70-1f1b-41d2-8b0b-47d37c068b42')
              assert.lengthOf(res.body.members, 0)
            })
            .end(done)
        })

        it('should GET (unchanged) group for bovine domain', function (done) {
          this.timeout(10000)
          agent
            .get('/scim/v2/Groups/group-Managers')
            .trustLocalhost(true)
            .set('Authorization', authTokenB)
            .expect('Content-Type', /application\/scim\+json/)
            .expect('Location', /\/scim\/v2\/Groups\/group-Managers/)
            .expect(200)
            .expect(res => {
              assert.include(res.body.schemas, 'urn:ietf:params:scim:schemas:core:2.0:Group')
              assert.equal(res.body.displayName, 'Managers')
              assert.equal(res.body.externalId, 'AD7BFFD4-22EA-488D-AEEB-9A14C0802CF2')
              assert.lengthOf(res.body.members, 0)
            })
            .end(done)
        })

        it('should GET groups for feline domain', function (done) {
          this.timeout(10000)
          agent
            .get('/scim/v2/Groups')
            .trustLocalhost(true)
            .set('Authorization', authTokenF)
            .query({ filter: 'displayName eq "Managers"' })
            .expect('Content-Type', /application\/scim\+json/)
            .expect(200)
            .expect(res => {
              assert.equal(res.body.totalResults, 1)
              assert.include(res.body.schemas, 'urn:ietf:params:scim:api:messages:2.0:ListResponse')
              assert.lengthOf(res.body.Resources, 1)
              assert.equal(res.body.Resources[0].displayName, 'Managers')
              assert.equal(res.body.Resources[0].externalId, 'b2b3fe70-1f1b-41d2-8b0b-47d37c068b42')
            })
            .end(done)
        })

        it('should GET groups for bovine domain', function (done) {
          this.timeout(10000)
          agent
            .get('/scim/v2/Groups')
            .trustLocalhost(true)
            .set('Authorization', authTokenB)
            .query({ filter: 'displayName eq "Managers"' })
            .expect('Content-Type', /application\/scim\+json/)
            .expect(200)
            .expect(res => {
              assert.equal(res.body.totalResults, 1)
              assert.include(res.body.schemas, 'urn:ietf:params:scim:api:messages:2.0:ListResponse')
              assert.lengthOf(res.body.Resources, 1)
              assert.equal(res.body.Resources[0].displayName, 'Managers')
              assert.equal(res.body.Resources[0].externalId, 'AD7BFFD4-22EA-488D-AEEB-9A14C0802CF2')
            })
            .end(done)
        })
      })
    })
  })

  run()
}, 500)
