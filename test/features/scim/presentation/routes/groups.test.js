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
const authToken = 'Bearer ZGFuZ2VyIG1vdXNl'

setTimeout(function () {
  describe('/Groups API', function () {
    it('should return 401 when missing Bearer token', function (done) {
      agent
        .get('/scim/v2/Groups')
        .trustLocalhost(true)
        .expect(401, done)
    })

    it('should return 401 when wrong Bearer token', function (done) {
      agent
        .get('/scim/v2/Groups')
        .trustLocalhost(true)
        .set('Authorization', 'Bearer d3JvbmcgdG9rZW4=')
        .expect(401, done)
    })

    it('should return 404 for no such group', function (done) {
      agent
        .get('/scim/v2/Groups/does-not-exist')
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .expect('Content-Type', /application\/scim\+json/)
        .expect(404)
        .expect(res => {
          assert.equal(res.body.status, '404')
          assert.include(res.body.schemas, 'urn:ietf:params:scim:api:messages:2.0:Error')
          assert.equal(res.body.detail, 'Resource does-not-exist not found')
        })
        .end(done)
    })

    it('should return error for group with space', function (done) {
      agent
        .get('/scim/v2/Groups/has%20spaces')
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .expect('Content-Type', /application\/scim\+json/)
        .expect(400)
        .expect(res => {
          assert.equal(res.body.status, '400')
          assert.include(res.body.schemas, 'urn:ietf:params:scim:api:messages:2.0:Error')
          assert.equal(res.body.detail, 'group name cannot contain spaces')
        })
        .end(done)
    })

    it('should return an empty list when no groups', function (done) {
      agent
        .get('/scim/v2/Groups')
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .expect('Content-Type', /application\/scim\+json/)
        .expect(200)
        .expect(res => {
          assert.equal(res.body.totalResults, 0)
          assert.include(res.body.schemas, 'urn:ietf:params:scim:api:messages:2.0:ListResponse')
          assert.lengthOf(res.body.Resources, 0)
        })
        .end(done)
    })

    it('should reject bad content-type when creating group', function (done) {
      agent
        .post('/scim/v2/Groups')
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .send('plain text request body')
        .expect(400, /Content-Type must be \(scim\+\)json/, done)
    })

    it('should reject group creation without schemas', function (done) {
      agent
        .post('/scim/v2/Groups')
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .send({
          externalId: '0300937E-6651-473B-B0CA-F9ACED7F5038',
          displayName: 'Group1DisplayName',
          members: []
        })
        .expect(400)
        .expect(res => {
          assert.equal(res.body.status, '400')
          assert.include(res.body.schemas, 'urn:ietf:params:scim:api:messages:2.0:Error')
          assert.include(res.body.detail, 'schemas must be defined')
        })
        .end(done)
    })

    it('should reject group creation if name contains spaces', function (done) {
      agent
        .post('/scim/v2/Groups')
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .send({
          externalId: '61A9073F-40A5-4491-A1D7-43ED1F091C33',
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
          displayName: 'has spaces',
          members: []
        })
        .expect(400)
        .expect(res => {
          assert.equal(res.body.status, '400')
          assert.include(res.body.schemas, 'urn:ietf:params:scim:api:messages:2.0:Error')
          assert.include(res.body.detail, 'group name cannot contain spaces')
        })
        .end(done)
    })

    it('should create a group when inputs are valid', function (done) {
      agent
        .post('/scim/v2/Groups')
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .send({
          externalId: 'D838B4BB-6811-4E51-A2AE-478037C85ABE',
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
          displayName: 'Group1DisplayName',
          members: []
        })
        .expect('Content-Type', /application\/scim\+json/)
        .expect('Location', /\/scim\/v2\/Groups\/group-Group1DisplayName/)
        .expect(201)
        .expect(res => {
          assert.include(res.body.schemas, 'urn:ietf:params:scim:schemas:core:2.0:Group')
          assert.equal(res.body.displayName, 'Group1DisplayName')
          assert.lengthOf(res.body.members, 0)
          assert.exists(res.body.meta.created)
          assert.exists(res.body.meta.lastModified)
          assert.equal(res.body.meta.resourceType, 'Group')
          assert.match(res.body.meta.location, /\/scim\/v2\/Groups\/group-Group1DisplayName/)
        })
        .end(done)
    })

    it('should reject creating the same group again', function (done) {
      agent
        .post('/scim/v2/Groups')
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .send({
          externalId: 'D838B4BB-6811-4E51-A2AE-478037C85ABE',
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
          displayName: 'Group1DisplayName',
          members: []
        })
        .expect('Location', /\/scim\/v2\/Groups\/group-Group1DisplayName/)
        .expect(409, done)
    })

    it('should return the one group created (Groups)', function (done) {
      agent
        .get('/scim/v2/Groups')
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .expect('Content-Type', /application\/scim\+json/)
        .expect(200)
        .expect(res => {
          assert.equal(res.body.totalResults, 1)
          assert.include(res.body.schemas, 'urn:ietf:params:scim:api:messages:2.0:ListResponse')
          assert.lengthOf(res.body.Resources, 1)
          assert.include(res.body.Resources[0].schemas, 'urn:ietf:params:scim:schemas:core:2.0:Group')
          assert.include(res.body.Resources[0].displayName, 'Group1DisplayName')
          assert.lengthOf(res.body.Resources[0].members, 0)
        })
        .end(done)
    })

    it('should return the one group created (Group)', function (done) {
      agent
        .get('/scim/v2/Groups/Group1DisplayName')
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .expect('Content-Type', /application\/scim\+json/)
        .expect(200)
        .expect(res => {
          assert.include(res.body.schemas, 'urn:ietf:params:scim:schemas:core:2.0:Group')
          assert.equal(res.body.displayName, 'Group1DisplayName')
          assert.lengthOf(res.body.members, 0)
          assert.exists(res.body.meta.created)
          assert.exists(res.body.meta.lastModified)
          assert.equal(res.body.meta.resourceType, 'Group')
          assert.match(res.body.meta.location, /\/scim\/v2\/Groups\/group-Group1DisplayName/)
        })
        .end(done)
    })

    it('should exclude members even when no members (Groups)', function (done) {
      // in other words, the server should quietly function correctly even when
      // there is nothing to do (filter non-existent members)
      agent
        .get('/scim/v2/Groups')
        .query({ excludedAttributes: ['members'] })
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .expect('Content-Type', /application\/scim\+json/)
        .expect(200)
        .expect(res => {
          assert.equal(res.body.totalResults, 1)
          assert.include(res.body.schemas, 'urn:ietf:params:scim:api:messages:2.0:ListResponse')
          assert.lengthOf(res.body.Resources, 1)
          assert.include(res.body.Resources[0].schemas, 'urn:ietf:params:scim:schemas:core:2.0:Group')
          assert.include(res.body.Resources[0].displayName, 'Group1DisplayName')
          assert.isUndefined(res.body.Resources[0].members)
        })
        .end(done)
    })

    it('should exclude members even when no members (Group)', function (done) {
      // in other words, the server should quietly function correctly even when
      // there is nothing to do (filter non-existent members)
      agent
        .get('/scim/v2/Groups/Group1DisplayName')
        .query({ excludedAttributes: ['members'] })
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .expect('Content-Type', /application\/scim\+json/)
        .expect(200)
        .expect(res => {
          assert.include(res.body.schemas, 'urn:ietf:params:scim:schemas:core:2.0:Group')
          assert.equal(res.body.displayName, 'Group1DisplayName')
          assert.exists(res.body.meta.created)
          assert.exists(res.body.meta.lastModified)
          assert.equal(res.body.meta.resourceType, 'Group')
          assert.match(res.body.meta.location, /\/scim\/v2\/Groups\/group-Group1DisplayName/)
        })
        .end(done)
    })

    it('should create a populated group', function (done) {
      agent
        .post('/scim/v2/Groups')
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .send({
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
          externalId: '727CCD46-2325-4BFE-B9D0-948B62E0B820',
          displayName: 'GroupDisplayName2',
          members:
            [
              { value: 'UserName123', display: 'Bob Wardwood' },
              { value: 'UserName222', display: 'Jane Houston' }
            ]
        })
        .expect('Content-Type', /application\/scim\+json/)
        .expect('Location', /\/scim\/v2\/Groups\/group-GroupDisplayName2/)
        .expect(201)
        .expect(res => {
          assert.include(res.body.schemas, 'urn:ietf:params:scim:schemas:core:2.0:Group')
          assert.equal(res.body.displayName, 'GroupDisplayName2')
          assert.lengthOf(res.body.members, 2)
          assert.isOk(res.body.members.every(e => e.$ref.match(/\/scim\/v2\/Users\//)))
          assert.isOk(res.body.members.find((e) => e.value === 'UserName123'))
          assert.isOk(res.body.members.find((e) => e.value === 'UserName222'))
          assert.exists(res.body.meta.created)
          assert.exists(res.body.meta.lastModified)
          assert.equal(res.body.meta.resourceType, 'Group')
          assert.match(res.body.meta.location, /\/scim\/v2\/Groups\/group-GroupDisplayName2/)
        })
        .end(done)
    })

    it('should exclude members from all Groups', function (done) {
      agent
        .get('/scim/v2/Groups')
        .query({ excludedAttributes: ['members'] })
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .expect('Content-Type', /application\/scim\+json/)
        .expect(200)
        .expect(res => {
          assert.equal(res.body.totalResults, 2)
          assert.include(res.body.schemas, 'urn:ietf:params:scim:api:messages:2.0:ListResponse')
          assert.lengthOf(res.body.Resources, 2)
          assert.isOk(res.body.Resources.every((e) => {
            return e.schemas.includes('urn:ietf:params:scim:schemas:core:2.0:Group')
          }))
          assert.isOk(res.body.Resources.find((e) => e.displayName === 'Group1DisplayName'))
          assert.isOk(res.body.Resources.find((e) => e.displayName === 'GroupDisplayName2'))
          assert.isUndefined(res.body.Resources[0].members)
          assert.isUndefined(res.body.Resources[1].members)
        })
        .end(done)
    })

    it('should exclude members from all Groups (required field)', function (done) {
      agent
        .get('/scim/v2/Groups')
        .query({ excludedAttributes: ['members', 'displayName'] })
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .expect('Content-Type', /application\/scim\+json/)
        .expect(200)
        .expect(res => {
          assert.equal(res.body.totalResults, 2)
          assert.include(res.body.schemas, 'urn:ietf:params:scim:api:messages:2.0:ListResponse')
          assert.lengthOf(res.body.Resources, 2)
          assert.isOk(res.body.Resources.every((e) => {
            return e.schemas.includes('urn:ietf:params:scim:schemas:core:2.0:Group')
          }))
          assert.isOk(res.body.Resources.find((e) => e.displayName === 'Group1DisplayName'))
          assert.isOk(res.body.Resources.find((e) => e.displayName === 'GroupDisplayName2'))
          assert.isUndefined(res.body.Resources[0].members)
          assert.isUndefined(res.body.Resources[1].members)
        })
        .end(done)
    })

    it('should exclude members from single Group', function (done) {
      agent
        .get('/scim/v2/Groups/GroupDisplayName2')
        .query({ excludedAttributes: ['members'] })
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .expect('Content-Type', /application\/scim\+json/)
        .expect(200)
        .expect(res => {
          assert.include(res.body.schemas, 'urn:ietf:params:scim:schemas:core:2.0:Group')
          assert.equal(res.body.displayName, 'GroupDisplayName2')
          assert.isUndefined(res.body.members)
          assert.exists(res.body.meta.created)
          assert.exists(res.body.meta.lastModified)
          assert.equal(res.body.meta.resourceType, 'Group')
          assert.match(res.body.meta.location, /\/scim\/v2\/Groups\/group-GroupDisplayName2/)
        })
        .end(done)
    })

    it('should exclude members from single Group (required field)', function (done) {
      agent
        .get('/scim/v2/Groups/GroupDisplayName2')
        .query({ excludedAttributes: ['members', 'displayName'] })
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .expect('Content-Type', /application\/scim\+json/)
        .expect(200)
        .expect(res => {
          assert.include(res.body.schemas, 'urn:ietf:params:scim:schemas:core:2.0:Group')
          assert.equal(res.body.displayName, 'GroupDisplayName2')
          assert.isUndefined(res.body.members)
          assert.exists(res.body.meta.created)
          assert.exists(res.body.meta.lastModified)
          assert.equal(res.body.meta.resourceType, 'Group')
          assert.match(res.body.meta.location, /\/scim\/v2\/Groups\/group-GroupDisplayName2/)
        })
        .end(done)
    })

    it('should return the two groups created so far', function (done) {
      agent
        .get('/scim/v2/Groups')
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .expect('Content-Type', /application\/scim\+json/)
        .expect(200)
        .expect(res => {
          assert.equal(res.body.totalResults, 2)
          assert.include(res.body.schemas, 'urn:ietf:params:scim:api:messages:2.0:ListResponse')
          assert.lengthOf(res.body.Resources, 2)
          assert.isOk(res.body.Resources.every((e) => {
            return e.schemas.includes('urn:ietf:params:scim:schemas:core:2.0:Group')
          }))
          assert.isOk(res.body.Resources.find((e) => e.displayName === 'Group1DisplayName'))
          assert.isOk(res.body.Resources.find((e) => e.displayName === 'GroupDisplayName2'))
        })
        .end(done)
    })

    it('should return groups based on given attribute values', function (done) {
      agent
        .get('/scim/v2/Groups')
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .query({ filter: 'displayName eq "Group1DisplayName"' })
        .expect('Content-Type', /application\/scim\+json/)
        .expect(200)
        .expect(res => {
          assert.equal(res.body.totalResults, 1)
          assert.include(res.body.schemas, 'urn:ietf:params:scim:api:messages:2.0:ListResponse')
          assert.lengthOf(res.body.Resources, 1)
          assert.include(res.body.Resources[0].schemas, 'urn:ietf:params:scim:schemas:core:2.0:Group')
          assert.equal(res.body.Resources[0].displayName, 'Group1DisplayName')
        })
        .end(done)
    })

    it('should return 404 when patching no such group', function (done) {
      agent
        .patch('/scim/v2/Groups/does-not-exist')
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .send({
          schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
          Operations: [{ op: 'replace', path: 'foobar', value: 'quux' }]
        })
        .expect('Content-Type', /application\/scim\+json/)
        .expect(404)
        .expect(res => {
          assert.equal(res.body.status, '404')
          assert.include(res.body.schemas, 'urn:ietf:params:scim:api:messages:2.0:Error')
          assert.equal(res.body.detail, 'Resource does-not-exist not found')
        })
        .end(done)
    })

    it('should allow adding a user to a group', function (done) {
      agent
        .patch('/scim/v2/Groups/Group1DisplayName')
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .send({
          schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
          Operations: [
            {
              name: 'addMember',
              op: 'add',
              path: 'members',
              value: [
                { displayName: 'James Unlocke', value: 'jamesun' }
              ]
            }
          ]
        })
        .expect('Content-Type', /application\/scim\+json/)
        .expect('Location', /\/scim\/v2\/Groups\/group-Group1DisplayName/)
        .expect(200)
        .expect(res => {
          assert.include(res.body.schemas, 'urn:ietf:params:scim:schemas:core:2.0:Group')
          assert.equal(res.body.displayName, 'Group1DisplayName')
          assert.lengthOf(res.body.members, 1)
          assert.equal(res.body.members[0].value, 'jamesun')
          assert.match(res.body.members[0].$ref, /\/scim\/v2\/Users\/jamesun/)
          assert.exists(res.body.meta.created)
          assert.exists(res.body.meta.lastModified)
          assert.equal(res.body.meta.resourceType, 'Group')
          assert.match(res.body.meta.location, /\/scim\/v2\/Groups\/group-Group1DisplayName/)
        })
        .end(done)
    })

    it('should return the modified group', function (done) {
      agent
        .get('/scim/v2/Groups/Group1DisplayName')
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .expect('Content-Type', /application\/scim\+json/)
        .expect('Location', /\/scim\/v2\/Groups\/group-Group1DisplayName/)
        .expect(200)
        .expect(res => {
          assert.include(res.body.schemas, 'urn:ietf:params:scim:schemas:core:2.0:Group')
          assert.equal(res.body.displayName, 'Group1DisplayName')
          assert.lengthOf(res.body.members, 1)
          assert.equal(res.body.members[0].value, 'jamesun')
          assert.match(res.body.members[0].$ref, /\/scim\/v2\/Users\/jamesun/)
          assert.exists(res.body.meta.created)
          assert.exists(res.body.meta.lastModified)
          assert.equal(res.body.meta.resourceType, 'Group')
          assert.match(res.body.meta.location, /\/scim\/v2\/Groups\/group-Group1DisplayName/)
        })
        .end(done)
    })

    it('should allow removing a user from a group', function (done) {
      agent
        .patch('/scim/v2/Groups/Group1DisplayName')
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .send({
          schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
          Operations: [
            {
              op: 'remove',
              path: 'members[value eq "jamesun"]'
            }
          ]
        })
        .expect('Content-Type', /application\/scim\+json/)
        .expect('Location', /\/scim\/v2\/Groups\/group-Group1DisplayName/)
        .expect(200)
        .expect(res => {
          assert.include(res.body.schemas, 'urn:ietf:params:scim:schemas:core:2.0:Group')
          assert.equal(res.body.displayName, 'Group1DisplayName')
          assert.lengthOf(res.body.members, 0)
        })
        .end(done)
    })

    it('should return 404 when updating no such group', function (done) {
      agent
        .put('/scim/v2/Groups/does-not-exist')
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .send({
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
          displayName: 'NoSuchGroupName',
          members: []
        })
        .expect('Content-Type', /application\/scim\+json/)
        .expect(404)
        .expect(res => {
          assert.equal(res.body.status, '404')
          assert.include(res.body.schemas, 'urn:ietf:params:scim:api:messages:2.0:Error')
          assert.equal(res.body.detail, 'Resource does-not-exist not found')
        })
        .end(done)
    })

    it('should update a group with all new information', function (done) {
      agent
        .put('/scim/v2/Groups/Group1DisplayName')
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .send({
          externalId: 'D838B4BB-6811-4E51-A2AE-478037C85ABE',
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
          id: 'Group1DisplayName',
          displayName: 'Group1DisplayName',
          members: [
            { value: 'UserName123', display: 'Bob Wardwood' },
            { value: 'UserName222', display: 'Jane Houston' }
          ]
        })
        .expect('Content-Type', /application\/scim\+json/)
        .expect('Location', /\/scim\/v2\/Groups\/group-Group1DisplayName/)
        .expect(200)
        .expect(res => {
          assert.include(res.body.schemas, 'urn:ietf:params:scim:schemas:core:2.0:Group')
          assert.equal(res.body.displayName, 'Group1DisplayName')
          assert.lengthOf(res.body.members, 2)
          assert.isOk(res.body.members.every(e => e.$ref.match(/\/scim\/v2\/Users\//)))
          assert.isOk(res.body.members.find((e) => e.value === 'UserName123'))
          assert.isOk(res.body.members.find((e) => e.value === 'UserName222'))
          assert.exists(res.body.meta.created)
          assert.exists(res.body.meta.lastModified)
          assert.equal(res.body.meta.resourceType, 'Group')
          assert.match(res.body.meta.location, /\/scim\/v2\/Groups\/group-Group1DisplayName/)
        })
        .end(done)
    })

    it('should return the updated group', function (done) {
      agent
        .get('/scim/v2/Groups/Group1DisplayName')
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .expect('Content-Type', /application\/scim\+json/)
        .expect('Location', /\/scim\/v2\/Groups\/group-Group1DisplayName/)
        .expect(200)
        .expect(res => {
          assert.include(res.body.schemas, 'urn:ietf:params:scim:schemas:core:2.0:Group')
          assert.equal(res.body.displayName, 'Group1DisplayName')
          assert.lengthOf(res.body.members, 2)
          assert.isOk(res.body.members.every(e => e.$ref.match(/\/scim\/v2\/Users\//)))
          assert.isOk(res.body.members.find((e) => e.value === 'UserName123'))
          assert.isOk(res.body.members.find((e) => e.value === 'UserName222'))
          assert.exists(res.body.meta.created)
          assert.exists(res.body.meta.lastModified)
          assert.equal(res.body.meta.resourceType, 'Group')
          assert.match(res.body.meta.location, /\/scim\/v2\/Groups\/group-Group1DisplayName/)
        })
        .end(done)
    })

    it('should reject attempts to rename a group via PUT', function (done) {
      agent
        .put('/scim/v2/Groups/Group1DisplayName')
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .send({
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
          displayName: 'SomeOtherName',
          members: [
            { value: 'UserName123', display: 'Bob Wardwood' },
            { value: 'UserName222', display: 'Jane Houston' }
          ]
        })
        .expect(400)
        .expect(res => {
          assert.equal(res.body.status, '400')
          assert.include(res.body.schemas, 'urn:ietf:params:scim:api:messages:2.0:Error')
          assert.equal(res.body.scimType, 'mutability')
          assert.equal(res.body.detail, 'Cannot change property displayName')
        })
        .end(done)
    })

    it('should reject attempts to rename a group via PATCH', function (done) {
      agent
        .patch('/scim/v2/Groups/Group1DisplayName')
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .send({
          schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
          Operations: [
            {
              op: 'replace',
              path: 'displayName',
              value: 'SomeOtherName'
            }
          ]
        })
        .expect(400)
        .expect(res => {
          assert.equal(res.body.status, '400')
          assert.include(res.body.schemas, 'urn:ietf:params:scim:api:messages:2.0:Error')
          assert.equal(res.body.scimType, 'mutability')
          assert.equal(res.body.detail, 'Cannot change property displayName')
        })
        .end(done)
    })

    it('should allow removing all users from a group', function (done) {
      agent
        .patch('/scim/v2/Groups/GroupDisplayName2')
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .send({
          schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
          Operations: [
            {
              op: 'remove',
              path: 'members'
            }
          ]
        })
        .expect('Content-Type', /application\/scim\+json/)
        .expect('Location', /\/scim\/v2\/Groups\/group-GroupDisplayName2/)
        .expect(200)
        .expect(res => {
          assert.include(res.body.schemas, 'urn:ietf:params:scim:schemas:core:2.0:Group')
          assert.equal(res.body.displayName, 'GroupDisplayName2')
          assert.lengthOf(res.body.members, 0)
        })
        .end(done)
    })

    it('should delete the first group', function (done) {
      agent
        .delete('/scim/v2/Groups/Group1DisplayName')
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .expect(204, done)
    })

    it('should delete the second group', function (done) {
      agent
        .delete('/scim/v2/Groups/GroupDisplayName2')
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .expect(204, done)
    })

    it('should return an empty list once all groups deleted', function (done) {
      agent
        .get('/scim/v2/Groups')
        .trustLocalhost(true)
        .set('Authorization', authToken)
        .expect('Content-Type', /application\/scim\+json/)
        .expect(200)
        .expect(res => {
          assert.equal(res.body.totalResults, 0)
          assert.include(res.body.schemas, 'urn:ietf:params:scim:api:messages:2.0:ListResponse')
          assert.lengthOf(res.body.Resources, 0)
        })
        .end(done)
    })
  })

  run()
}, 500)
