//
// Copyright 2023 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { afterEach, describe, it } from 'mocha'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'
import GetProvisioningDomains from 'helix-auth-svc/lib/features/scim/domain/usecases/GetProvisioningDomains.js'
import BearerTokenStrategy from 'helix-auth-svc/lib/features/scim/presentation/strategies/BearerTokenStrategy.js'

describe('BearerTokenStrategy', function () {
  const settingsRepository = new MapSettingsRepository()
  const getProvisioningDomains = GetProvisioningDomains({ settingsRepository })
  const strategy = BearerTokenStrategy({ getProvisioningDomains })

  afterEach(function () {
    settingsRepository.clear()
  })

  it('should raise an error for invalid input', function () {
    assert.throws(() => BearerTokenStrategy({ getProvisioningDomains: null }), AssertionError)
  })

  it('should return false when no domains available', function (done) {
    // arrange
    // act
    strategy._verify('keyboard cat', (err, value) => {
      // assert
      assert.isNull(err)
      assert.isFalse(value)
      done()
    })
  })

  it('should return error if provisioning misconfiguration', function (done) {
    // arrange
    settingsRepository.set('PROVISIONING', {
      foobar: 'something is wrong'
    })
    // act
    strategy._verify('keyboard cat', (err) => {
      // assert
      assert.equal(err.message, 'missing providers list in provisioning')
      done()
    })
  })

  it('should return false if mismatch for classic token', function (done) {
    // arrange
    settingsRepository.set('BEARER_TOKEN', 'frisbee dog')
    // act
    strategy._verify('a2V5Ym9hcmQgY2F0', (err, user) => {
      // assert
      assert.isNull(err)
      assert.isFalse(user)
      done()
    })
  })

  it('should succeed if matching with classic token', function (done) {
    // arrange
    settingsRepository.set('BEARER_TOKEN', 'keyboard cat')
    // act
    strategy._verify('a2V5Ym9hcmQgY2F0', (err, user, extra) => {
      // assert
      assert.isNull(err)
      assert.propertyVal(user, 'userName', 'unused')
      assert.isUndefined(user.domain)
      assert.equal(extra.scope, 'all')
      done()
    })
  })

  it('should return false if mismatch for all providers', function (done) {
    // arrange
    settingsRepository.set('PROVISIONING', {
      providers: [
        { bearerToken: 'frisbee dog', domain: 'canine' },
        { bearerToken: 'keyboard cat', domain: 'feline' }
      ]
    })
    // act
    strategy._verify('not encoded, not work', (err, user) => {
      // assert
      assert.isNull(err)
      assert.isFalse(user)
      done()
    })
  })

  it('should succeed if matching with configured provider', function (done) {
    // arrange
    settingsRepository.set('PROVISIONING', {
      providers: [
        { bearerToken: 'frisbee dog', domain: 'canine' },
        { bearerToken: 'keyboard cat', domain: 'feline' }
      ]
    })
    // act
    strategy._verify('a2V5Ym9hcmQgY2F0', (err, user, extra) => {
      // assert
      assert.isNull(err)
      assert.propertyVal(user, 'userName', 'unused')
      assert.propertyVal(user, 'domain', 'feline')
      assert.equal(extra.scope, 'all')
      done()
    })
  })
})
