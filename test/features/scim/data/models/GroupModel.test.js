//
// Copyright 2024 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { describe, it } from 'mocha'
import { GroupModel } from 'helix-auth-svc/lib/features/scim/data/models/GroupModel.js'

describe('Group model', function () {
  it('should raise an error for invalid input', function () {
    assert.throws(() => new GroupModel(null), AssertionError)
    assert.throws(() => new GroupModel('foo', null), AssertionError)
  })

  it('should return expected property values', function () {
    // arrange
    const tGroup = new GroupModel('staff', ['joe'])
    // assert
    assert.equal(tGroup.displayName, 'staff')
    assert.equal(tGroup.members[0], 'joe')
  })

  it('should reject unknown SCIM group schema', function () {
    // arrange
    const rawJson = {
      externalId: 'DupesAreNotGroups',
      schemas: ['urn:ietf:params:scim:schemas:lore:1.0:Dupes'],
      dipslayName: 'dupes',
      emails: []
    }
    // assert
    assert.throws(() => GroupModel.fromJson(rawJson), AssertionError)
  })

  it('should parse from JSON formatted entity', function () {
    // arrange
    const rawJson = {
      externalId: '30f06075-8ac7-450f-b74d-9a78d45c152d',
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
      displayName: 'Group1DisplayName',
      members: []
    }
    const group = GroupModel.fromJson(rawJson)
    // assert
    assert.equal(group.displayName, 'Group1DisplayName')
    assert.equal(group.externalId, '30f06075-8ac7-450f-b74d-9a78d45c152d')
    assert.lengthOf(group.members, 0)
  })

  it('should parse JSON case insensitively', function () {
    // arrange
    const rawJson = {
      EXTERNALID: '30f06075-8ac7-450f-b74d-9a78d45c152d',
      ScheMaS: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
      DisplayName: 'Group1DisplayName',
      Members: []
    }
    const group = GroupModel.fromJson(rawJson)
    // assert
    assert.equal(group.displayName, 'Group1DisplayName')
    assert.equal(group.externalId, '30f06075-8ac7-450f-b74d-9a78d45c152d')
    assert.lengthOf(group.members, 0)
  })

  it('should parse JSON with members list', function () {
    // arrange
    const rawJson = {
      externalId: '__UUID',
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
      displayName: 'staff',
      members: [
        {
          value: 'joe',
          display: 'Joe Plumber'
        },
        {
          value: 'susan',
          display: 'Susan Winters'
        }
      ]
    }
    const group = GroupModel.fromJson(rawJson)
    // assert
    assert.equal(group.displayName, 'staff')
    assert.lengthOf(group.members, 2)
    assert.isOk(group.members.find((e) => e.value === 'joe'))
    assert.isOk(group.members.find((e) => e.value === 'susan'))
  })

  it('should round-trip JSON with members list', function () {
    // arrange
    const inputJson = {
      externalId: '30f06075-8ac7-450f-b74d-9a78d45c152d',
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
      displayName: 'staff',
      members: [
        { value: 'joe', display: 'Joe Plumber' },
        { value: 'susan', display: 'Susan Winters' }
      ]
    }
    const group = GroupModel.fromJson(inputJson)
    const actualJson = group.toJson()
    // cannot compare the internally generated dates
    delete actualJson.meta
    // assert
    const expectedJson = {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
      id: 'group-staff',
      externalId: '30f06075-8ac7-450f-b74d-9a78d45c152d',
      displayName: 'staff',
      members: [
        { value: 'joe', display: 'Joe Plumber' },
        { value: 'susan', display: 'Susan Winters' }
      ]
    }
    assert.deepEqual(actualJson, expectedJson)
  })
})
