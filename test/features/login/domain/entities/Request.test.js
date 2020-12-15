//
// Copyright 2020 Perforce Software
//
const { AssertionError } = require('assert')
const { assert } = require('chai')
const { describe, it } = require('mocha')
const path = require('path')

/* global include */
global.include = (p) => require(path.join(__dirname, '../../../../..', p))

const Request = include('lib/features/login/domain/entities/Request')

describe('Request entity', function () {
  it('should raise an error for invalid input', function () {
    assert.throws(() => new Request(null), AssertionError)
    assert.throws(() => new Request(null, null), AssertionError)
  })

  it('should return expected property values', function () {
    // arrange
    const tRequest = new Request('request123', 'joeuser', false)
    // assert
    assert.equal(tRequest.id, 'request123')
    assert.equal(tRequest.userId, 'joeuser')
    assert.isFalse(tRequest.forceAuthn)
  })

  it('should convert to/from JSON', function () {
    // arrange
    const tRequest = new Request('request123', 'joeuser', false)
    // act
    const encoded = tRequest.toJson()
    const decoded = Request.fromJson(encoded)
    // assert
    assert.equal(decoded.id, 'request123')
    assert.equal(decoded.userId, 'joeuser')
    assert.isFalse(decoded.forceAuthn)
  })
})
