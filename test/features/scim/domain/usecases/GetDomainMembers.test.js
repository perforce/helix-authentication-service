//
// Copyright 2023 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { afterEach, describe, it } from 'mocha'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'
import GetDomainMembers from 'helix-auth-svc/lib/features/scim/domain/usecases/GetDomainMembers.js'
import GetProvisioningServers from 'helix-auth-svc/lib/features/scim/domain/usecases/GetProvisioningServers.js'

describe('GetDomainMembers use case', function () {
  const settingsRepository = new MapSettingsRepository()
  const getProvisioningServers = GetProvisioningServers({ settingsRepository })
  const usecase = GetDomainMembers({ getProvisioningServers })

  afterEach(function () {
    settingsRepository.clear()
  })

  it('should raise an error for invalid input', function () {
    assert.throws(() => GetDomainMembers({ getProvisioningServers: null }), AssertionError)
  })

  it('should raise error when no servers available', function () {
    // arrange
    // act
    const members = usecase()
    // assert
    assert.isEmpty(members)
  })

  it('should return the one server for basic settings', function () {
    // arrange
    settingsRepository.set('P4PORT', 'ssl:1666')
    settingsRepository.set('P4USER', 'super')
    settingsRepository.set('P4PASSWD', 'secret123')
    // act
    const results = usecase()
    // assert
    assert.lengthOf(results, 1)
    assert.equal(results[0].p4port, 'ssl:1666')
    assert.equal(results[0].p4user, 'super')
    assert.equal(results[0].p4passwd, 'secret123')
  })

  it('should raise error if domain mismatch (1 entry)', function () {
    // arrange
    settingsRepository.set('PROVISIONING', {
      servers: [
        { p4port: 'ssl:1666', p4user: 'super', p4passwd: 'secret123', domains: ['canine'] }
      ]
    })
    // act
    try {
      usecase('bovine')
    } catch (err) {
      // assert
      assert.equal(err.message, 'no servers configured for domain: bovine')
    }
  })

  it('should return empty if only one server for domain (single)', function () {
    // arrange
    settingsRepository.set('PROVISIONING', {
      servers: [
        { p4port: 'ssl:1666', p4user: 'super', p4passwd: 'secret123', domains: ['canine'] }
      ]
    })
    // act
    const results = usecase('canine')
    // assert
    assert.isEmpty(results)
  })

  it('should return empty if only one server for domain (multiple)', function () {
    // arrange
    settingsRepository.set('PROVISIONING', {
      servers: [
        {
          p4port: 'ssl:chicago:1666',
          p4user: 'super',
          p4passwd: '2E7092CC2CA6BCAC74EB364BF4C4AD99',
          domains: ['feline'],
        },
        {
          p4port: 'ssl:tokyo:1666',
          p4user: 'super',
          p4passwd: 'C8478F3F32B62A84731ADDB5A2443E68',
          domains: ['canine']
        },
        {
          p4port: 'ssl:europa:1666',
          p4user: 'super',
          p4passwd: '32B62A84731AC8478F3FDDB5A2443E68',
          domains: ['bovine']
        }
      ]
    })
    // act
    const results = usecase('feline')
    assert.isEmpty(results)
  })

  it('should raise error if domain mismatch (>1 entries)', function () {
    // arrange
    settingsRepository.set('PROVISIONING', {
      servers: [
        {
          p4port: 'ssl:chicago:1666',
          p4user: 'super',
          p4passwd: '2E7092CC2CA6BCAC74EB364BF4C4AD99',
          domains: ['feline', 'canine'],
          leader: ['canine']
        },
        {
          p4port: 'ssl:tokyo:1666',
          p4user: 'super',
          p4passwd: 'C8478F3F32B62A84731ADDB5A2443E68',
          domains: ['canine']
        }
      ]
    })
    // act
    try {
      usecase('bovine')
    } catch (err) {
      // assert
      assert.equal(err.message, 'no servers configured for domain: bovine')
    }
  })

  it('should return non-leader servers for domain', function () {
    // arrange
    settingsRepository.set('PROVISIONING', {
      servers: [
        {
          p4port: 'ssl:chicago:1666',
          p4user: 'super',
          p4passwd: '2E7092CC2CA6BCAC74EB364BF4C4AD99',
          domains: ['canine'],
          leader: ['canine']
        },
        {
          p4port: 'ssl:tokyo:1666',
          p4user: 'super',
          p4passwd: 'C8478F3F32B62A84731ADDB5A2443E68',
          domains: ['canine']
        },
        {
          p4port: 'ssl:europa:1666',
          p4user: 'super',
          p4passwd: '32B62A84731AC8478F3FDDB5A2443E68',
          domains: ['canine']
        }
      ]
    })
    // act
    const results = usecase('canine')
    assert.lengthOf(results, 2)
    assert.equal(results[0].p4port, 'ssl:tokyo:1666')
    assert.equal(results[1].p4port, 'ssl:europa:1666')
  })
})
