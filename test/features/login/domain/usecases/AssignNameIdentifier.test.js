//
// Copyright 2023 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { before, beforeEach, describe, it } from 'mocha'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'
import AssignNameIdentifier from 'helix-auth-svc/lib/features/login/domain/usecases/AssignNameIdentifier.js'

describe('AssignNameIdentifier use case', function () {
  const settingsRepository = new MapSettingsRepository()
  let usecase

  before(function () {
    usecase = AssignNameIdentifier({ settingsRepository })
  })

  beforeEach(function () {
    settingsRepository.clear()
  })

  it('should raise an error for invalid input', function () {
    assert.throws(() => AssignNameIdentifier({ settingsRepository: null }), AssertionError)
    try {
      usecase(null)
      assert.fail('should have raised error')
    } catch (err) {
      assert.instanceOf(err, AssertionError)
    }
  })

  it('should not make unnecessary changes', function () {
    // arrange
    const input = {
      email: 'user@example.com',
      sub: '1234567890',
      nameID: 'validuser',
      nameIDFormat: 'formatted'
    }
    // act
    const result = usecase(input)
    // assert
    assert.property(result, 'nameID')
    assert.equal(result.nameID, 'validuser')
    assert.property(result, 'nameIDFormat')
    assert.equal(result.nameIDFormat, 'formatted')
  })

  it('should use email if available', function () {
    // arrange
    const input = {
      email: 'user@example.com',
      sub: '1234567890'
    }
    // act
    const result = usecase(input)
    // assert
    assert.property(result, 'nameID')
    assert.equal(result.nameID, 'user@example.com')
    assert.property(result, 'nameIDFormat')
    assert.equal(result.nameIDFormat, 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified')
    assert.isUndefined(input.nameID)
  })

  it('should use sub if email field is missing', function () {
    // arrange
    const input = {
      field1: 'value1',
      sub: '1234567890'
    }
    // act
    const result = usecase(input)
    // assert
    assert.property(result, 'nameID')
    assert.equal(result.nameID, '1234567890')
    assert.property(result, 'nameIDFormat')
    assert.equal(result.nameIDFormat, 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified')
  })

  it('should generate a unique value if nothing else', function () {
    // arrange
    const input = {
      field1: 'value1',
      field2: 'value2'
    }
    // act
    const result = usecase(input)
    // assert
    assert.property(result, 'nameID')
    assert.match(result.nameID, /\d+/)
    assert.property(result, 'nameIDFormat')
    assert.equal(result.nameIDFormat, 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified')
  })

  it('should use specific name identifier field', function () {
    // arrange
    const input = {
      email: 'user@example.com',
      sub: '1234567890',
      myNameId: 'actualNameId'
    }
    settingsRepository.set('SAML_NAMEID_FIELD', 'myNameId')
    // act
    const result = usecase(input)
    // assert
    assert.property(result, 'nameID')
    assert.equal(result.nameID, 'actualNameId')
    assert.property(result, 'nameIDFormat')
    assert.equal(result.nameIDFormat, 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified')
  })

  it('should use fallback if specified field is missing', function () {
    // arrange
    const input = {
      email: 'user@example.com',
      sub: '1234567890'
    }
    settingsRepository.set('SAML_NAMEID_FIELD', 'myNameId')
    // act
    const result = usecase(input)
    // assert
    assert.property(result, 'nameID')
    assert.equal(result.nameID, 'user@example.com')
    assert.property(result, 'nameIDFormat')
    assert.equal(result.nameIDFormat, 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified')
  })
})
