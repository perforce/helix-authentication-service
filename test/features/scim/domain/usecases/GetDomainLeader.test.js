//
// Copyright 2023 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { afterEach, describe, it } from 'mocha'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'
import GetDomainLeader from 'helix-auth-svc/lib/features/scim/domain/usecases/GetDomainLeader.js'
import GetProvisioningServers from 'helix-auth-svc/lib/features/scim/domain/usecases/GetProvisioningServers.js'

describe('GetDomainLeader use case', function () {
  const settingsRepository = new MapSettingsRepository()
  const getProvisioningServers = GetProvisioningServers({ settingsRepository })
  const usecase = GetDomainLeader({ getProvisioningServers })

  afterEach(function () {
    settingsRepository.clear()
  })

  it('should raise an error for invalid input', function () {
    assert.throws(() => GetDomainLeader({ getProvisioningServers: null }), AssertionError)
  })

  it('should raise error when no servers available', function () {
    // arrange
    // act
    const leader = usecase()
    // assert
    assert.isNull(leader)
  })

  it('should return the one server for basic settings', function () {
    // arrange
    settingsRepository.set('P4PORT', 'ssl:1666')
    settingsRepository.set('P4USER', 'super')
    settingsRepository.set('P4PASSWD', 'secret123')
    // act
    const result = usecase()
    // assert
    assert.equal(result.p4port, 'ssl:1666')
    assert.equal(result.p4user, 'super')
    assert.equal(result.p4passwd, 'secret123')
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
      assert.equal(err.message, 'no server configured for domain: bovine')
    }
  })

  it('should return matching server in new settings', function () {
    // arrange
    settingsRepository.set('PROVISIONING', {
      servers: [
        { p4port: 'ssl:1666', p4user: 'super', p4passwd: 'secret123', domains: ['canine'] }
      ]
    })
    // act
    const result = usecase('canine')
    // assert
    assert.equal(result.p4port, 'ssl:1666')
    assert.equal(result.p4user, 'super')
    assert.equal(result.p4passwd, 'secret123')
    assert.lengthOf(result.domains, 1)
    assert.equal(result.domains[0], 'canine')
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
    try {
      // act
      usecase('bovine')
    } catch (err) {
      // assert
      assert.equal(err.message, 'no server configured for domain: bovine')
    }
  })

  it('should return the one server for a domain', function () {
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
        }
      ]
    })
    // act
    const result = usecase('feline')
    assert.equal(result.p4port, 'ssl:chicago:1666')
    assert.equal(result.domains[0], 'feline')
  })

  it('should return leader for a domain', function () {
    // arrange
    settingsRepository.set('PROVISIONING', {
      servers: [
        {
          p4port: 'ssl:europa:1666',
          p4user: 'super',
          p4passwd: 'C2CA6BCAC742E7092CEB364BF4C4AD99',
          domains: ['feline', 'canine'],
          leader: ['feline']
        },
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
    const result = usecase('canine')
    assert.equal(result.p4port, 'ssl:chicago:1666')
    assert.equal(result.leader[0], 'canine')
  })
})
