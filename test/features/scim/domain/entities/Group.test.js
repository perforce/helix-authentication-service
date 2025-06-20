//
// Copyright 2021 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { describe, it } from 'mocha'
import { Group } from 'helix-auth-svc/lib/features/scim/domain/entities/Group.js'

describe('Group entity', function () {
  it('should raise an error for invalid input', function () {
    assert.throws(() => new Group(null), AssertionError)
    assert.throws(() => new Group('staff', null), AssertionError)
  })

  it('should return expected property values', function () {
    // arrange
    const tGroup = new Group('staff', [])
    // assert
    assert.equal(tGroup.displayName, 'staff')
  })

  it('should produce identical clones', function () {
    // arrange
    const original = new Group('staff', [{ value: 'joe' }, { value: 'susan' }])
    const cloned = original.clone()
    // assert
    assert.isFalse(original === cloned)
    assert.isTrue(original.equals(cloned))
  })

  it('should produce independent clones', function () {
    // arrange
    const original = new Group('staff', [{ value: 'joe' }, { value: 'susan' }])
    const cloned = original.clone()
    original.members[0] = { value: 'mike' }
    // assert
    assert.equal(original.members[0].value, 'mike')
    assert.equal(cloned.members[0].value, 'joe')
  })

  it('should notice changed externalId', function () {
    // arrange
    const original = new Group('staff', [])
    original.externalId = 'staff123'
    const cloned = original.clone()
    cloned.externalId = 'grpstaff0'
    // assert
    assert.isFalse(original.equals(cloned))
  })

  it('should treat identical groups as equal', function () {
    // arrange
    const groupa = new Group('staff', [{ value: 'joe' }, { value: 'susan' }])
    const groupb = new Group('staff', [{ value: 'joe' }, { value: 'susan' }])
    // assert
    assert.isFalse(groupa === groupb)
    assert.isTrue(groupa.equals(groupb))
  })

  it('should treat groups with different members as not equal', function () {
    // arrange
    const groupa = new Group('staff', [{ value: 'joe' }, { value: 'susan' }])
    const groupb = new Group('staff', [{ value: 'sam' }, { value: 'susan' }])
    // assert
    assert.isFalse(groupa === groupb)
    assert.isFalse(groupa.equals(groupb))
  })
})
