//
// Copyright 2021 Perforce Software
//
const path = require('path')
const { assert } = require('chai')
const { describe, it, run } = require('mocha')
const request = require('supertest')

// Override any existing .env file by loading our test configuration.
require('dotenv').config({ path: 'test/dot.env' })

/* global include */
global.include = (p) => require(path.join(__dirname, '../../../../..', p))
const app = include('lib/app')
const { createServer } = include('lib/server')
const container = include('lib/container')
const settings = container.resolve('settingsRepository')
const server = createServer(app, settings)
const agent = request.agent(server)
const authToken = 'Bearer ZGFuZ2VyIG1vdXNl'

setTimeout(function () {
  describe('/Users API', function () {
    it('should return 401 when missing Bearer token', function (done) {
      agent
        .get('/scim/v2/Users')
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

    it('should return 401 when wrong Bearer token', function (done) {
      agent
        .get('/scim/v2/Users')
        .trustLocalhost(true)
        .set('Authorization', 'Bearer d3JvbmcgdG9rZW4=')
        .expect(401)
        // eslint-disable-next-line no-unused-vars
        .end(function (err, res) {
          if (err) {
            return done(err)
          }
          done()
        })
    })

    it('should return 404 for no such user', function (done) {
      agent
        .get('/scim/v2/Users/does-not-exist')
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .expect(404)
        .expect('Content-Type', /application\/scim\+json/)
        .expect(res => {
          assert.equal(res.body.status, '404')
          assert.include(res.body.schemas, 'urn:ietf:params:scim:api:messages:2.0:Error')
          assert.equal(res.body.detail, 'Resource does-not-exist not found')
        })
        // eslint-disable-next-line no-unused-vars
        .end(function (err, res) {
          if (err) {
            return done(err)
          }
          done()
        })
    })

    it('should return an empty list when no users', function (done) {
      agent
        .get('/scim/v2/Users')
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .expect(200)
        .expect('Content-Type', /application\/scim\+json/)
        .expect(res => {
          assert.equal(res.body.totalResults, 0)
          assert.include(res.body.schemas, 'urn:ietf:params:scim:api:messages:2.0:ListResponse')
          assert.lengthOf(res.body.Resources, 0)
        })
        // eslint-disable-next-line no-unused-vars
        .end(function (err, res) {
          if (err) {
            return done(err)
          }
          done()
        })
    })

    it('should reject bad content-type when creating user', function (done) {
      agent
        .post('/scim/v2/Users')
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .send('plain text request body')
        .expect(400)
        .expect(res => {
          assert.include(res.text, 'Content-Type must be (scim+)json')
        })
        // eslint-disable-next-line no-unused-vars
        .end(function (err, res) {
          if (err) {
            return done(err)
          }
          done()
        })
    })

    it('should reject user creation without schemas', function (done) {
      agent
        .post('/scim/v2/Users')
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .send({
          UserName: 'UserName123',
          name: { formatted: 'Ryan Leenay' },
          emails: [{ value: 'testing@bob.com' }]
        })
        .expect(400)
        .expect(res => {
          assert.equal(res.body.status, '400')
          assert.include(res.body.schemas, 'urn:ietf:params:scim:api:messages:2.0:Error')
          assert.include(res.body.detail, 'schemas must be defined')
        })
        // eslint-disable-next-line no-unused-vars
        .end(function (err, res) {
          if (err) {
            return done(err)
          }
          done()
        })
    })

    it('should create a user when inputs are valid', function (done) {
      agent
        .post('/scim/v2/Users')
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .send({
          UserName: 'UserName123',
          Active: true,
          DisplayName: 'BobIsAmazing',
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
          externalId: '7604050A-C37B-44DA-876B-808215812400',
          name: {
            formatted: 'Ryan Leenay',
            familyName: 'Leenay',
            givenName: 'Ryan'
          },
          emails: [
            {
              Primary: true,
              type: 'work',
              value: 'testing@bob.com'
            },
            {
              Primary: false,
              type: 'home',
              value: 'testinghome@bob.com'
            }
          ]
        })
        .expect(201)
        .expect('Content-Type', /application\/scim\+json/)
        .expect('Location', /\/scim\/v2\/Users\//)
        .expect(res => {
          assert.include(res.body.schemas, 'urn:ietf:params:scim:schemas:core:2.0:User')
          assert.equal(res.body.userName, 'UserName123')
          assert.equal(res.body.displayName, 'Ryan Leenay')
          assert.equal(res.body.name.formatted, 'Ryan Leenay')
          assert.lengthOf(res.body.emails, 1)
          assert.equal(res.body.emails[0].value, 'testing@bob.com')
          assert.exists(res.body.meta.created)
          assert.exists(res.body.meta.lastModified)
          assert.equal(res.body.meta.resourceType, 'User')
          assert.match(res.body.meta.location, /\/scim\/v2\/Users\/UserName123/)
        })
        // eslint-disable-next-line no-unused-vars
        .end(function (err, res) {
          if (err) {
            return done(err)
          }
          done()
        })
    })

    it('should reject creating the same user again', function (done) {
      agent
        .post('/scim/v2/Users')
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .send({
          UserName: 'UserName123',
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
          name: { formatted: 'Ryan Leenay' },
          emails: [{ value: 'testing@bob.com' }]
        })
        .expect(409)
        .expect('Location', /\/scim\/v2\/Users\//)
        // eslint-disable-next-line no-unused-vars
        .end(function (err, res) {
          if (err) {
            return done(err)
          }
          done()
        })
    })

    it('should return the one user created so far', function (done) {
      agent
        .get('/scim/v2/Users')
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .expect(200)
        .expect('Content-Type', /application\/scim\+json/)
        .expect(res => {
          assert.equal(res.body.totalResults, 1)
          assert.include(res.body.schemas, 'urn:ietf:params:scim:api:messages:2.0:ListResponse')
          assert.lengthOf(res.body.Resources, 1)
          assert.include(res.body.Resources[0].schemas, 'urn:ietf:params:scim:schemas:core:2.0:User')
          assert.include(res.body.Resources[0].userName, 'UserName123')
        })
        // eslint-disable-next-line no-unused-vars
        .end(function (err, res) {
          if (err) {
            return done(err)
          }
          done()
        })
    })

    it('should create an enterprise user as a normal user', function (done) {
      agent
        .post('/scim/v2/Users')
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .send({
          UserName: 'UserName222',
          Active: true,
          DisplayName: 'lennay',
          schemas: [
            'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User',
            'urn:ietf:params:scim:schemas:core:2.0:User'
          ],
          externalId: '__UUID',
          name: {
            formatted: 'Andrew Ryan',
            familyName: 'Ryan',
            givenName: 'Andrew'
          },
          emails: [
            {
              Primary: true,
              type: 'work',
              value: 'testing@bob2.com'
            },
            {
              Primary: false,
              type: 'home',
              value: 'testinghome@bob3.com'
            }
          ],
          'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User': {
            Department: 'bob',
            Manager: { Value: 'SuzzyQ' }
          }
        })
        .expect(201)
        .expect('Content-Type', /application\/scim\+json/)
        .expect('Location', /\/scim\/v2\/Users\//)
        .expect(res => {
          assert.include(res.body.schemas, 'urn:ietf:params:scim:schemas:core:2.0:User')
          assert.equal(res.body.userName, 'UserName222')
          assert.equal(res.body.displayName, 'Andrew Ryan')
          assert.equal(res.body.name.formatted, 'Andrew Ryan')
          assert.lengthOf(res.body.emails, 1)
          assert.equal(res.body.emails[0].value, 'testing@bob2.com')
        })
        // eslint-disable-next-line no-unused-vars
        .end(function (err, res) {
          if (err) {
            return done(err)
          }
          done()
        })
    })

    it('should return the two users created so far', function (done) {
      agent
        .get('/scim/v2/Users')
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .expect(200)
        .expect('Content-Type', /application\/scim\+json/)
        .expect(res => {
          assert.equal(res.body.totalResults, 2)
          assert.include(res.body.schemas, 'urn:ietf:params:scim:api:messages:2.0:ListResponse')
          assert.lengthOf(res.body.Resources, 2)
          assert.isOk(res.body.Resources.every((e) => {
            return e.schemas.includes('urn:ietf:params:scim:schemas:core:2.0:User')
          }))
          assert.isOk(res.body.Resources.find((e) => e.userName === 'UserName123'))
          assert.isOk(res.body.Resources.find((e) => e.userName === 'UserName222'))
        })
        // eslint-disable-next-line no-unused-vars
        .end(function (err, res) {
          if (err) {
            return done(err)
          }
          done()
        })
    })

    it('should return 404 when patching no such user', function (done) {
      agent
        .patch('/scim/v2/Users/does-not-exist')
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .send({
          schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
          Operations: [{ op: 'replace', path: 'foobar', value: 'quux' }]
        })
        .expect(404)
        .expect('Content-Type', /application\/scim\+json/)
        .expect(res => {
          assert.equal(res.body.status, '404')
          assert.include(res.body.schemas, 'urn:ietf:params:scim:api:messages:2.0:Error')
          assert.equal(res.body.detail, 'Resource does-not-exist not found')
        })
        // eslint-disable-next-line no-unused-vars
        .end(function (err, res) {
          if (err) {
            return done(err)
          }
          done()
        })
    })

    it('should allow patching an existing user', function (done) {
      agent
        .patch('/scim/v2/Users/UserName222')
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .send({
          schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
          Operations: [
            {
              op: 'replace',
              path: 'name.formatted',
              value: 'Drew Ryan'
            }
          ]
        })
        .expect(200)
        .expect('Content-Type', /application\/scim\+json/)
        .expect('Location', /\/scim\/v2\/Users\//)
        .expect(res => {
          assert.include(res.body.schemas, 'urn:ietf:params:scim:schemas:core:2.0:User')
          assert.equal(res.body.userName, 'UserName222')
          assert.equal(res.body.displayName, 'Drew Ryan')
          assert.equal(res.body.name.formatted, 'Drew Ryan')
          assert.lengthOf(res.body.emails, 1)
          assert.equal(res.body.emails[0].value, 'testing@bob2.com')
        })
        // eslint-disable-next-line no-unused-vars
        .end(function (err, res) {
          if (err) {
            return done(err)
          }
          done()
        })
    })

    it('should return the patched user', function (done) {
      agent
        .get('/scim/v2/Users/UserName222')
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .expect(200)
        .expect('Content-Type', /application\/scim\+json/)
        .expect('Location', /\/scim\/v2\/Users\//)
        .expect(res => {
          assert.include(res.body.schemas, 'urn:ietf:params:scim:schemas:core:2.0:User')
          assert.equal(res.body.userName, 'UserName222')
          assert.equal(res.body.displayName, 'Drew Ryan')
          assert.equal(res.body.name.formatted, 'Drew Ryan')
          assert.lengthOf(res.body.emails, 1)
          assert.equal(res.body.emails[0].value, 'testing@bob2.com')
          assert.exists(res.body.meta.created)
          assert.exists(res.body.meta.lastModified)
          assert.equal(res.body.meta.resourceType, 'User')
          assert.match(res.body.meta.location, /\/scim\/v2\/Users\/UserName222/)
        })
        // eslint-disable-next-line no-unused-vars
        .end(function (err, res) {
          if (err) {
            return done(err)
          }
          done()
        })
    })

    it('should return 404 when updating no such user', function (done) {
      agent
        .put('/scim/v2/Users/does-not-exist')
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .send({
          UserName: 'UserName444',
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
          name: { formatted: 'Dwain Letrain' },
          emails: [{ value: 'ltrain@example.com' }]
        })
        .expect(404)
        .expect('Content-Type', /application\/scim\+json/)
        .expect(res => {
          assert.equal(res.body.status, '404')
          assert.include(res.body.schemas, 'urn:ietf:params:scim:api:messages:2.0:Error')
          assert.equal(res.body.detail, 'Resource does-not-exist not found')
        })
        // eslint-disable-next-line no-unused-vars
        .end(function (err, res) {
          if (err) {
            return done(err)
          }
          done()
        })
    })

    it('should update a user with all new information', function (done) {
      agent
        .put('/scim/v2/Users/UserName123')
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .send({
          // structure that Okta sends when updating a user entity
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
          id: 'UserName123',
          UserName: 'UserName123',
          displayName: 'Ryan P. Leenay',
          name: { formatted: 'Ryan P. Leenay', givenName: 'Ryan', familyName: 'Leenay' },
          emails: [
            { value: 'testingwork@bob.com' },
            { primary: true, value: 'testingwork@bob.com', type: 'work' }
          ],
          meta: {
            resourceType: 'User',
            created: '1970-01-01T00:33:41.000Z',
            lastModified: '1970-01-01T00:33:41.000Z',
            location: 'https://example.com/scim/v2/Users/UserName123'
          },
          phoneNumbers: [
            { primary: true, value: '123-555-1212', type: 'work' }
          ],
          locale: 'en-US',
          externalId: '00u817r7wlQHRQFTB357',
          groups: []
        })
        .expect(200)
        .expect('Content-Type', /application\/scim\+json/)
        .expect('Location', /\/scim\/v2\/Users\//)
        .expect(res => {
          assert.include(res.body.schemas, 'urn:ietf:params:scim:schemas:core:2.0:User')
          assert.equal(res.body.userName, 'UserName123')
          assert.equal(res.body.displayName, 'Ryan P. Leenay')
          assert.equal(res.body.name.formatted, 'Ryan P. Leenay')
          assert.lengthOf(res.body.emails, 1)
          assert.equal(res.body.emails[0].value, 'testingwork@bob.com')
        })
        // eslint-disable-next-line no-unused-vars
        .end(function (err, res) {
          if (err) {
            return done(err)
          }
          done()
        })
    })

    it('should return the updated user', function (done) {
      agent
        .get('/scim/v2/Users/UserName123')
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .expect(200)
        .expect('Content-Type', /application\/scim\+json/)
        .expect('Location', /\/scim\/v2\/Users\//)
        .expect(res => {
          assert.include(res.body.schemas, 'urn:ietf:params:scim:schemas:core:2.0:User')
          assert.equal(res.body.userName, 'UserName123')
          assert.equal(res.body.displayName, 'Ryan P. Leenay')
          assert.equal(res.body.name.formatted, 'Ryan P. Leenay')
          assert.lengthOf(res.body.emails, 1)
          assert.equal(res.body.emails[0].value, 'testingwork@bob.com')
          assert.exists(res.body.meta.created)
          assert.exists(res.body.meta.lastModified)
          assert.equal(res.body.meta.resourceType, 'User')
          assert.match(res.body.meta.location, /\/scim\/v2\/Users\/UserName123/)
        })
        // eslint-disable-next-line no-unused-vars
        .end(function (err, res) {
          if (err) {
            return done(err)
          }
          done()
        })
    })

    //
    // Effectively meaningless as we always return all of the attributes we
    // have, so asking for certain attributes is completely useless.
    //
    it('should return selected user attributes', function (done) {
      agent
        .get('/scim/v2/Users')
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .query({ attributes: 'userName' })
        .expect(200)
        .expect('Content-Type', /application\/scim\+json/)
        .expect(res => {
          assert.equal(res.body.totalResults, 2)
          assert.lengthOf(res.body.Resources, 2)
          assert.isOk(res.body.Resources.find((e) => e.userName === 'UserName123'))
          assert.isOk(res.body.Resources.find((e) => e.userName === 'UserName222'))
        })
        // eslint-disable-next-line no-unused-vars
        .end(function (err, res) {
          if (err) {
            return done(err)
          }
          done()
        })
    })

    //
    // Not yet supported; the query succeeds but all attributes are returned.
    //
    // it('should exclude specified user attributes', function (done) {
    //   agent
    //     .get('/scim/v2/Users')
    //     .trustLocalhost(true)
    //     .set('Authorization', authToken)
    //     .query({ excludedAttributes: 'emails' })
    //     .expect(200)
    //     .expect('Content-Type', /application\/scim\+json/)
    //     .expect(res => {
    //       assert.equal(res.body.totalResults, 2)
    //       assert.lengthOf(res.body.Resources, 2)
    //       assert.isOk(res.body.Resources.every((e) => {
    //         return ('emails' in e === false)
    //       }))
    //       assert.isOk(res.body.Resources.find((e) => e.userName === 'UserName123'))
    //       assert.isOk(res.body.Resources.find((e) => e.userName === 'UserName222'))
    //     })
    //     // eslint-disable-next-line no-unused-vars
    //     .end(function (err, res) {
    //       if (err) {
    //         return done(err)
    //       }
    //       done()
    //     })
    // })

    it('should return users based on given attribute values', function (done) {
      agent
        .get('/scim/v2/Users')
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .query({ filter: 'emails[value eq "testingwork@bob.com"]' })
        .expect(200)
        .expect('Content-Type', /application\/scim\+json/)
        .expect(res => {
          assert.equal(res.body.totalResults, 1)
          assert.include(res.body.schemas, 'urn:ietf:params:scim:api:messages:2.0:ListResponse')
          assert.lengthOf(res.body.Resources, 1)
          assert.include(res.body.Resources[0].schemas, 'urn:ietf:params:scim:schemas:core:2.0:User')
          assert.equal(res.body.Resources[0].userName, 'UserName123')
        })
        // eslint-disable-next-line no-unused-vars
        .end(function (err, res) {
          if (err) {
            return done(err)
          }
          done()
        })
    })

    it('should rename a user via PUT', function (done) {
      agent
        .put('/scim/v2/Users/UserName123')
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .send({
          UserName: 'UserNameOne1',
          Active: true,
          DisplayName: 'Ryan Leenay',
          schemas: [
            'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User',
            'urn:ietf:params:scim:schemas:core:2.0:User'
          ],
          id: 'UserName123',
          externalId: '6A8950C7-8510-41B6-B6F8-120F78FA9A62',
          name: { formatted: 'Ryan P. Leenay' },
          emails: [
            { primary: true, value: 'testingwork@bob.com' },
            { Primary: false, type: 'home', value: 'testinghome@bob.com' }
          ]
        })
        .expect(200)
        .expect('Content-Type', /application\/scim\+json/)
        .expect('Location', /\/scim\/v2\/Users\//)
        .expect(res => {
          assert.include(res.body.schemas, 'urn:ietf:params:scim:schemas:core:2.0:User')
          assert.equal(res.body.userName, 'UserNameOne1')
          assert.equal(res.body.displayName, 'Ryan P. Leenay')
          assert.equal(res.body.name.formatted, 'Ryan P. Leenay')
          assert.lengthOf(res.body.emails, 1)
          assert.equal(res.body.emails[0].value, 'testingwork@bob.com')
        })
        // eslint-disable-next-line no-unused-vars
        .end(function (err, res) {
          if (err) {
            return done(err)
          }
          done()
        })
    })

    it('should rename a user via PATCH', function (done) {
      agent
        .patch('/scim/v2/Users/UserName222')
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .send({
          schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
          Operations: [
            {
              op: 'replace',
              path: 'userName',
              value: 'UserNameTutu'
            }
          ]
        })
        .expect(200)
        .expect('Content-Type', /application\/scim\+json/)
        .expect('Location', /\/scim\/v2\/Users\//)
        .expect(res => {
          assert.include(res.body.schemas, 'urn:ietf:params:scim:schemas:core:2.0:User')
          assert.equal(res.body.userName, 'UserNameTutu')
          assert.equal(res.body.displayName, 'Drew Ryan')
          assert.equal(res.body.name.formatted, 'Drew Ryan')
          assert.lengthOf(res.body.emails, 1)
          assert.equal(res.body.emails[0].value, 'testing@bob2.com')
        })
        // eslint-disable-next-line no-unused-vars
        .end(function (err, res) {
          if (err) {
            return done(err)
          }
          done()
        })
    })

    it('should delete the first user', function (done) {
      agent
        .delete('/scim/v2/Users/UserNameOne1')
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .expect(204)
        // eslint-disable-next-line no-unused-vars
        .end(function (err, res) {
          if (err) {
            return done(err)
          }
          done()
        })
    })

    it('should delete the second user', function (done) {
      agent
        .delete('/scim/v2/Users/UserNameTutu')
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .expect(204)
        // eslint-disable-next-line no-unused-vars
        .end(function (err, res) {
          if (err) {
            return done(err)
          }
          done()
        })
    })

    it('should return an empty list once all users deleted', function (done) {
      agent
        .get('/scim/v2/Users')
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .expect(200)
        .expect('Content-Type', /application\/scim\+json/)
        .expect(res => {
          assert.equal(res.body.totalResults, 0)
          assert.include(res.body.schemas, 'urn:ietf:params:scim:api:messages:2.0:ListResponse')
          assert.lengthOf(res.body.Resources, 0)
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

  run()
}, 500)
