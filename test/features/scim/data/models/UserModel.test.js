//
// Copyright 2021 Perforce Software
//
const { AssertionError } = require('assert')
const { assert } = require('chai')
const { describe, it } = require('mocha')
const path = require('path')

/* global include */
global.include = (p) => require(path.join(__dirname, '../../../../..', p))

const UserModel = include('lib/features/scim/data/models/UserModel')

describe('User model', function () {
  it('should raise an error for invalid input', function () {
    assert.throws(() => new UserModel(null), AssertionError)
    assert.throws(() => new UserModel('foo', null), AssertionError)
    assert.throws(() => new UserModel('foo', 'bar', null), AssertionError)
  })

  it('should return expected property values', function () {
    // arrange
    const tUser = new UserModel('joeuser', 'joeuser@example.com', 'Joe Q. User')
    // assert
    assert.equal(tUser.username, 'joeuser')
    assert.equal(tUser.email, 'joeuser@example.com')
    assert.equal(tUser.fullname, 'Joe Q. User')
  })

  it('should reject unknown SCIM user schema', function () {
    // arrange
    const rawJson = {
      schemas: ['urn:ietf:params:scim:schemas:lore:1.0:Loser'],
      userName: 'joeuser',
      name: {
        formatted: 'Joe Q. User'
      },
      emails: [
        { value: 'joeuser@example.com' }
      ]
    }
    // assert
    assert.throws(() => UserModel.fromJson(rawJson), AssertionError)
  })

  it('should parse from JSON formatted entity', function () {
    // arrange
    const rawJson = {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      userName: 'joeuser',
      name: {
        formatted: 'Joe Q. User',
        familyName: 'Joe',
        givenName: 'User'
      },
      emails: [
        {
          value: 'joeuser@work.com',
          type: 'work'
        },
        {
          value: 'joejoe@play.com',
          primary: true
        }
      ]
    }
    const tUserModel = UserModel.fromJson(rawJson)
    // assert
    assert.equal(tUserModel.username, 'joeuser')
    assert.equal(tUserModel.email, 'joejoe@play.com')
    assert.equal(tUserModel.fullname, 'Joe Q. User')
    assert.isTrue(tUserModel.active)
  })

  it('should accept valid User schemas', function () {
    // arrange
    const rawJson = {
      schemas: [
        'urn:ietf:params:scim:schemas:core:2.0:User',
        'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User'
      ],
      externalId: 'susan',
      userName: 'susan@example.com',
      active: true,
      displayName: 'Susan Winters',
      meta: { resourceType: 'User' }
    }
    const tUserModel = UserModel.fromJson(rawJson)
    // assert
    assert.equal(tUserModel.username, 'susan')
    assert.equal(tUserModel.email, 'susan@example.com')
    assert.equal(tUserModel.fullname, 'Susan Winters')
    assert.isTrue(tUserModel.active)
  })

  it('should parse JSON case insensitively', function () {
    // arrange
    const rawJson = {
      UserName: 'UserName123',
      Active: false,
      DisplayName: 'BobIsAmazing',
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      externalId: 'c0726250-b78e-4171-a358-b9a0de8fcd96',
      name: { formatted: 'Ryan Leenay', familyName: 'Leenay', givenName: 'Ryan' },
      emails: [
        { Primary: true, type: 'work', value: 'testing@bob.com' },
        { Primary: false, type: 'home', value: 'testinghome@bob.com' }
      ]
    }
    const tUserModel = UserModel.fromJson(rawJson)
    // assert
    assert.equal(tUserModel.username, 'UserName123')
    assert.equal(tUserModel.email, 'testing@bob.com')
    assert.equal(tUserModel.fullname, 'Ryan Leenay')
    assert.isFalse(tUserModel.active)
  })

  it('should set fullname to given+family as fallback', function () {
    // arrange
    const rawJson = {
      UserName: 'UserName123',
      Active: true,
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      externalId: 'c0726250-b78e-4171-a358-b9a0de8fcd96',
      name: { familyName: 'Leenay', givenName: 'Ryan' },
      emails: [{ value: 'testing@bob.com' }]
    }
    const tUserModel = UserModel.fromJson(rawJson)
    // assert
    assert.equal(tUserModel.username, 'UserName123')
    assert.equal(tUserModel.email, 'testing@bob.com')
    assert.equal(tUserModel.fullname, 'Ryan Leenay')
  })

  it('should set fullname to userName as last resort', function () {
    // arrange
    const rawJson = {
      UserName: 'UserName123',
      Active: true,
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      externalId: 'c0726250-b78e-4171-a358-b9a0de8fcd96',
      emails: [{ value: 'testing@bob.com' }]
    }
    const tUserModel = UserModel.fromJson(rawJson)
    // assert
    assert.equal(tUserModel.username, 'UserName123')
    assert.equal(tUserModel.email, 'testing@bob.com')
    assert.equal(tUserModel.fullname, 'UserName123')
  })

  it('should round-trip JSON for the supported attributes', function () {
    // arrange
    const inputJson = {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      externalId: 'c0726250-b78e-4171-a358-b9a0de8fcd96',
      active: true,
      userName: 'joeuser',
      name: { formatted: 'Joe Plumber', familyName: 'Plumber', givenName: 'Joe' },
      emails: [
        { value: 'joe@example.com', type: 'work', primary: true },
        { value: 'joey@example.com', primary: false }
      ]
    }
    const user = UserModel.fromJson(inputJson)
    const actualJson = user.toJson()
    // cannot compare the internally generated dates
    delete actualJson.meta
    // assert
    const expectedJson = {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      id: 'joeuser',
      displayName: 'Joe Plumber',
      userName: 'joeuser',
      name: { formatted: 'Joe Plumber' },
      emails: [{ value: 'joe@example.com' }]
    }
    assert.deepEqual(actualJson, expectedJson)
  })
})
