//
// Copyright 2021 Perforce Software
//
const { AssertionError } = require('assert')
const { assert } = require('chai')
const { describe, it } = require('mocha')
const path = require('path')

/* global include */
global.include = (p) => require(path.join(__dirname, '../../../../..', p))

const Group = include('lib/features/scim/domain/entities/Group')

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
    const original = new Group('staff', [])
    const cloned = original.clone()
    // assert
    assert.isFalse(original === cloned)
    assert.isTrue(original.equals(cloned))
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
