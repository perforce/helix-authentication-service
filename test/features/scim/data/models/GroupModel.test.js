//
// Copyright 2021 Perforce Software
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
    const tGroup = new GroupModel('staff', [{ value: 'joe' }])
    // assert
    assert.equal(tGroup.displayName, 'staff')
    assert.equal(tGroup.members[0].value, 'joe')
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

  it('should parse from P4 group specification', function () {
    // arrange
    const spec = {
      code: 'stat',
      Group: 'Group1DisplayName',
      Description: '',
      MaxResults: 'unset',
      MaxScanRows: 'unset',
      MaxLockTime: 'unset',
      MaxOpenFiles: 'unset',
      MaxMemory: 'unset',
      Timeout: '43200',
      PasswordTimeout: 'unset',
      Subgroups0: 'admins',
      Users0: 'joe',
      Users1: 'mike',
      Users2: 'susan'
    }
    const group = GroupModel.fromSpec(spec)
    // assert
    assert.equal(group.displayName, 'Group1DisplayName')
    assert.lengthOf(group.members, 4)
    assert.isTrue(group.members.some((g) => g.type === 'Group'))
    assert.isTrue(group.members.some((g) => g.type === 'User'))
    assert.isTrue(group.members.some((g) => g.value === 'group-admins'))
    assert.isTrue(group.members.some((g) => g.value === 'user-mike'))
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

  it('should round-trip P4 group specification', function () {
    // arrange
    const inputSpec = {
      code: 'stat',
      Group: 'Group1DisplayName',
      Description: '',
      MaxResults: 'unset',
      MaxScanRows: 'unset',
      MaxLockTime: 'unset',
      MaxOpenFiles: 'unset',
      MaxMemory: 'unset',
      Timeout: '43200',
      PasswordTimeout: 'unset',
      Subgroups0: 'admins',
      Users0: 'joe',
      Users1: 'mike',
      Users2: 'susan'
    }
    // act
    const model = GroupModel.fromSpec(inputSpec)
    const spec = model.toSpec()
    // assert
    assert.equal(spec.Group, 'Group1DisplayName')
    assert.equal(spec.Subgroups0, 'admins')
    assert.equal(spec.Users0, 'joe')
    assert.equal(spec.Users1, 'mike')
    assert.equal(spec.Users2, 'susan')
  })

  it('should merge entity with P4 group specification', function () {
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
    const model = GroupModel.fromJson(rawJson)
    // act
    const inputSpec = {
      code: 'stat',
      Group: 'staff',
      Description: '',
      MaxResults: 'unset',
      MaxScanRows: 'unset',
      MaxLockTime: 'unset',
      MaxOpenFiles: 'unset',
      MaxMemory: 'unset',
      Timeout: '43200',
      PasswordTimeout: 'unset',
      Subgroups0: 'admins',
      Owners0: 'super',
      Owners1: 'bruno',
      Users0: 'joe',
      Users1: 'mike',
      Users2: 'susan'
    }
    const merged = model.mergeSpec(inputSpec)
    // assert
    assert.equal(merged.Group, 'staff')
    assert.equal(merged.Description, '')
    assert.equal(merged.MaxResults, 'unset')
    assert.equal(merged.MaxScanRows, 'unset')
    assert.equal(merged.MaxLockTime, 'unset')
    assert.equal(merged.MaxOpenFiles, 'unset')
    assert.equal(merged.MaxMemory, 'unset')
    assert.equal(merged.Timeout, '43200')
    assert.equal(merged.PasswordTimeout, 'unset')
    assert.equal(merged.Owners0, 'super')
    assert.equal(merged.Owners1, 'bruno')
    assert.equal(merged.Users0, 'joe')
    assert.equal(merged.Users1, 'susan')
  })
})
