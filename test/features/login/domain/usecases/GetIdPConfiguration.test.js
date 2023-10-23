//
// Copyright 2023 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { describe, it } from 'mocha'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'
import GetIdPConfiguration from 'helix-auth-svc/lib/features/login/domain/usecases/GetIdPConfiguration.js'

describe('GetIdPConfiguration use case', function () {
  it('should raise an error for invalid input', async function () {
    assert.throws(() => GetIdPConfiguration({ settingsRepository: null }), AssertionError)
  })

  it('should return nothing when not configured', async function () {
    // arrange
    const settingsRepository = new MapSettingsRepository()
    const usecase = GetIdPConfiguration({ settingsRepository })
    // act
    const result = await usecase()
    // assert
    assert.isEmpty(result)
  })

  it('should fail when loading a malformed file', async function () {
    // arrange
    const settingsRepository = new MapSettingsRepository()
    settingsRepository.set('IDP_CONFIG', 'this is not valid')
    const usecase = GetIdPConfiguration({ settingsRepository })
    try {
      // act
      await usecase()
      assert.fail('should have raised error')
    } catch (err) {
      // assert
      assert.include(err.message, 'Unexpected identifier')
    }
  })

  it('should succesfully load a valid configuration from text', async function () {
    // arrange
    const config = `// configuration follows
module.exports = {
  'urn:swarm-example:sp': {
    acsUrl: 'https://swarm.example.com/api/v10/session'
  },
  'urn:swarm-2019.3:sp': {
    acsUrl: 'https://swarm.example.com/login'
  },
  'http://hth.example.com/account/saml/hth/metadata': {
    acsUrl: 'https://hth.example.com/account/saml/hth/consume'
  },
  // some comments
  'urn:swarm-201?.*:sp': {
    acsUrl: 'https://swarm.example.com/login'
  },
  'urn:swarm-group:sp': {
    acsUrls: [
      'http://swarm.example.com/chicago/api/v10/session',
      'http://swarm.example.com/tokyo/api/v10/session',
    ]
  },
  'urn:swarm-cluster:sp': {
    acsUrlRe: 'https://swarm\\\\.example\\\\.com/[^/]+/api/v10/session'
  }
}
`
    const settingsRepository = new MapSettingsRepository()
    settingsRepository.set('IDP_CONFIG', config)
    const usecase = GetIdPConfiguration({ settingsRepository })
    // act
    const result = await usecase()
    // assert
    assert.property(result, 'urn:swarm-example:sp')
  })

  it('should succesfully load a valid configuration from object', async function () {
    // arrange
    const config = {
      'urn:swarm-example:sp': {
        acsUrl: 'https://swarm.example.com/api/v10/session'
      },
      'urn:swarm-2019.3:sp': {
        acsUrl: 'https://swarm.example.com/login'
      },
      'http://hth.example.com/account/saml/hth/metadata': {
        acsUrl: 'https://hth.example.com/account/saml/hth/consume'
      },
      // some comments
      'urn:swarm-201?.*:sp': {
        acsUrl: 'https://swarm.example.com/login'
      },
      'urn:swarm-group:sp': {
        acsUrls: [
          'http://swarm.example.com/chicago/api/v10/session',
          'http://swarm.example.com/tokyo/api/v10/session',
        ]
      },
      'urn:swarm-cluster:sp': {
        acsUrlRe: 'https://swarm\\\\.example\\\\.com/[^/]+/api/v10/session'
      }
    }
    const settingsRepository = new MapSettingsRepository()
    settingsRepository.set('IDP_CONFIG', config)
    const usecase = GetIdPConfiguration({ settingsRepository })
    // act
    const result = await usecase()
    // assert
    assert.property(result, 'urn:swarm-example:sp')
  })
})
