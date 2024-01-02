//
// Copyright 2023 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { afterEach, describe, it } from 'mocha'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'
import GetProvisioningServers from 'helix-auth-svc/lib/features/scim/domain/usecases/GetProvisioningServers.js'

describe('GetProvisioningServers use case', function () {
  const settingsRepository = new MapSettingsRepository()
  const usecase = GetProvisioningServers({ settingsRepository })

  afterEach(function () {
    settingsRepository.clear()
  })

  it('should raise an error for invalid input', function () {
    assert.throws(() => GetProvisioningServers({ settingsRepository: null }), AssertionError)
  })

  it('should return [] when no servers available', function () {
    // arrange
    // act
    const results = usecase()
    // assert
    assert.isEmpty(results)
  })

  it('should return the one server for basic settings', function () {
    // arrange
    settingsRepository.set('P4PORT', 'ssl:1666')
    settingsRepository.set('P4USER', 'super')
    settingsRepository.set('P4PASSWD', 'secret123')
    settingsRepository.set('P4TICKETS', '/opt/perforce/.p4tickets')
    settingsRepository.set('P4TRUST', '/opt/perforce/.p4trust')
    // act
    const results = usecase()
    // assert
    assert.lengthOf(results, 1)
    assert.equal(results[0].p4port, 'ssl:1666')
    assert.equal(results[0].p4user, 'super')
    assert.equal(results[0].p4passwd, 'secret123')
    assert.equal(results[0].p4tickets, '/opt/perforce/.p4tickets')
    assert.equal(results[0].p4trust, '/opt/perforce/.p4trust')
  })

  it('should raise error if missing servers list', function () {
    // arrange
    settingsRepository.set('PROVISIONING', {
      foobar: 'something is wrong'
    })
    // act
    try {
      usecase()
      assert.fail('should have failed')
    } catch (err) {
      // assert
      assert.equal(err.message, 'missing servers list in provisioning')
    }
  })

  it('should raise error if servers is not a list', function () {
    // arrange
    settingsRepository.set('PROVISIONING', {
      servers: 'something is wrong'
    })
    // act
    try {
      usecase()
      assert.fail('should have failed')
    } catch (err) {
      // assert
      assert.equal(err.message, 'provisioning servers must be a list')
    }
  })

  it('should return a single server in new settings', function () {
    // arrange
    settingsRepository.set('PROVISIONING', {
      servers: [{
        p4port: 'ssl:1666',
        p4user: 'super',
        p4passwd: 'secret123',
        domains: ['corp'],
        p4tickets: '/opt/perforce/.p4tickets',
        p4trust: '/opt/perforce/.p4trust'
      }]
    })
    // act
    const results = usecase()
    // assert
    assert.lengthOf(results, 1)
    assert.equal(results[0].p4port, 'ssl:1666')
    assert.equal(results[0].p4user, 'super')
    assert.equal(results[0].p4passwd, 'secret123')
    assert.lengthOf(results[0].domains, 1)
    assert.equal(results[0].domains[0], 'corp')
    assert.equal(results[0].p4tickets, '/opt/perforce/.p4tickets')
    assert.equal(results[0].p4trust, '/opt/perforce/.p4trust')
  })

  it('should raise error if server without p4port', function () {
    // arrange
    settingsRepository.set('PROVISIONING', {
      servers: [
        { p4user: 'super', p4passwd: 'secret123', domains: ['corp'] }
      ]
    })
    // act
    try {
      usecase()
      assert.fail('should have failed')
    } catch (err) {
      // assert
      assert.include(err.message, 'missing p4port')
    }
  })

  it('should raise error if server without p4user', function () {
    // arrange
    settingsRepository.set('PROVISIONING', {
      servers: [
        { p4port: 'ssl:1666', p4passwd: 'secret123', domains: ['corp'] }
      ]
    })
    // act
    try {
      usecase()
      assert.fail('should have failed')
    } catch (err) {
      // assert
      assert.equal(err.message, 'server ssl:1666 missing p4user')
    }
  })

  it('should raise error if server without p4passwd', function () {
    // arrange
    settingsRepository.set('PROVISIONING', {
      servers: [
        { p4port: 'ssl:1666', p4user: 'super', domains: ['corp'] }
      ]
      // act
    })
    try {
      usecase()
      assert.fail('should have failed')
    } catch (err) {
      // assert
      assert.equal(err.message, 'server ssl:1666 missing p4passwd')
    }
  })

  it('should raise error if servers without domains', function () {
    // arrange
    settingsRepository.set('PROVISIONING', {
      servers: [
        { p4port: 'ssl:1666', p4user: 'super', p4passwd: 'secret123' }
      ]
    })
    // act
    try {
      usecase()
      assert.fail('should have failed')
    } catch (err) {
      // assert
      assert.equal(err.message, 'server ssl:1666 missing domains list')
    }
  })

  it('should raise error if domains is not a list', function () {
    // arrange
    settingsRepository.set('PROVISIONING', {
      servers: [
        { p4port: 'ssl:1666', p4user: 'super', p4passwd: 'secret123', domains: 'foobar' }
      ]
    })
    // act
    try {
      usecase()
      assert.fail('should have failed')
    } catch (err) {
      // assert
      assert.equal(err.message, 'server ssl:1666 domains must be a list')
    }
  })

  it('should raise error if domains is empty', function () {
    // arrange
    settingsRepository.set('PROVISIONING', {
      servers: [
        { p4port: 'ssl:1666', p4user: 'super', p4passwd: 'secret123', domains: [] }
      ]
    })
    // act
    try {
      usecase()
      assert.fail('should have failed')
    } catch (err) {
      // assert
      assert.equal(err.message, 'server ssl:1666 domains must not be empty')
    }
  })

  it('should raise error if leader is not an array', function () {
    // arrange
    settingsRepository.set('PROVISIONING', {
      servers: [
        {
          p4port: 'ssl:chicago:1666',
          p4user: 'super',
          p4passwd: '2E7092CC2CA6BCAC74EB364BF4C4AD99',
          domains: ['feline', 'canine'],
          leader: 'canine'
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
      usecase()
      assert.fail('should have failed')
    } catch (err) {
      // assert
      assert.equal(err.message, 'server ssl:chicago:1666 leader must be a list')
    }
  })

  it('should raise error if two leaders for one domain', function () {
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
          domains: ['canine'],
          leader: ['canine']
        }
      ]
    })
    // act
    try {
      usecase()
      assert.fail('should have failed')
    } catch (err) {
      // assert
      assert.equal(err.message, 'domain canine already as a leader')
    }
  })

  it('should raise error if multiple servers but no leader', function () {
    // arrange
    settingsRepository.set('PROVISIONING', {
      servers: [
        {
          p4port: 'ssl:chicago:1666',
          p4user: 'super',
          p4passwd: '2E7092CC2CA6BCAC74EB364BF4C4AD99',
          domains: ['canine']
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
      usecase()
      assert.fail('should have failed')
    } catch (err) {
      // assert
      assert.equal(err.message, 'domain canine must have one leader')
    }
  })

  it('should return the validated list of servers', function () {
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
    const results = usecase()
    assert.lengthOf(results, 2)
    assert.equal(results[0].p4port, 'ssl:chicago:1666')
    assert.equal(results[0].leader[0], 'canine')
    assert.equal(results[1].p4port, 'ssl:tokyo:1666')
    assert.isUndefined(results[1].leader)
  })
})
