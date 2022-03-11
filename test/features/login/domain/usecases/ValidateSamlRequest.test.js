//
// Copyright 2022 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { describe, it } from 'mocha'
import ValidateSamlRequest from 'helix-auth-svc/lib/features/login/domain/usecases/ValidateSamlRequest.js'

describe('ValidateSamlRequest use case', function () {
  it('should raise an error for invalid input', async function () {
    assert.throws(() => ValidateSamlRequest({ getIdPConfiguration: null }), AssertionError)
    const usecase = ValidateSamlRequest({ getIdPConfiguration: () => false })
    try {
      await usecase(null)
      assert.fail('should have raised error')
    } catch (err) {
      assert.instanceOf(err, AssertionError)
    }
    try {
      await usecase('non-null-value', null)
      assert.fail('should have raised error')
    } catch (err) {
      assert.instanceOf(err, AssertionError)
    }
  })

  it('should return false if empty configuration', async function () {
    // arrange
    const usecase = ValidateSamlRequest({ getIdPConfiguration: () => new Object() })
    // act
    const result = await usecase(
      'urn:swarm-example:sp',
      'https://swarm.example.com/api/v10/session'
    )
    // assert
    assert.isFalse(result)
  })

  it('should return false for equality non-matching recipient', async function () {
    // arrange
    const config = {
      'urn:swarm-example:sp': {
        acsUrl: 'https://swarm.example.com/api/v10/session'
      }
    }
    const usecase = ValidateSamlRequest({ getIdPConfiguration: () => config })
    // act
    const result = await usecase(
      'urn:swarm-example:sp',
      'https://bees.example.com/api/v10/session'
    )
    // assert
    assert.isFalse(result)
  })

  it('should return true for equality matching recipient', async function () {
    // arrange
    const config = {
      'urn:swarm-example:sp': {
        acsUrl: 'https://swarm.example.com/api/v10/session'
      }
    }
    const usecase = ValidateSamlRequest({ getIdPConfiguration: () => config })
    // act
    const result = await usecase(
      'urn:swarm-example:sp',
      'https://swarm.example.com/api/v10/session'
    )
    // assert
    assert.isTrue(result)
  })

  it('should return false for non-matching in list', async function () {
    // arrange
    const config = {
      'urn:swarm-example:sp': {
        acsUrls: [
          'https://swarm.example.com/chicago/api/v10/session',
          'https://swarm.example.com/tokyo/api/v10/session'
        ]
      }
    }
    const usecase = ValidateSamlRequest({ getIdPConfiguration: () => config })
    // act
    const result = await usecase(
      'urn:swarm-example:sp',
      'https://swarm.example.com/alameda/api/v10/session'
    )
    // assert
    assert.isFalse(result)
  })

  it('should return true for matching in list', async function () {
    // arrange
    const config = {
      'urn:swarm-example:sp': {
        acsUrls: [
          'https://swarm.example.com/chicago/api/v10/session',
          'https://swarm.example.com/tokyo/api/v10/session'
        ]
      }
    }
    const usecase = ValidateSamlRequest({ getIdPConfiguration: () => config })
    // act
    const result = await usecase(
      'urn:swarm-example:sp',
      'https://swarm.example.com/tokyo/api/v10/session'
    )
    // assert
    assert.isTrue(result)
  })

  it('should return false for regex non-matching recipient', async function () {
    // arrange
    const config = {
      'urn:swarm-example:sp': {
        acsUrlRe: 'https://swarm\\.example\\.com/[^/]+/api/v10/session'
      }
    }
    const usecase = ValidateSamlRequest({ getIdPConfiguration: () => config })
    // act
    const result = await usecase(
      'urn:swarm-example:sp',
      // good thing we escaped the . in the regex, otherwise this would pass;
      // and yes, that would be an exploit waiting to happen
      'https://swarmzexample.com/serverA/api/v10/session'
    )
    // assert
    assert.isFalse(result)
  })

  it('should return true for regex matching recipient', async function () {
    // arrange
    const config = {
      'urn:swarm-example:sp': {
        acsUrlRe: 'https://swarm\\.example\\.com/[^/]+/api/v10/session'
      }
    }
    const usecase = ValidateSamlRequest({ getIdPConfiguration: () => config })
    // act
    const result = await usecase(
      'urn:swarm-example:sp',
      'https://swarm.example.com/serverA/api/v10/session'
    )
    // assert
    assert.isTrue(result)
  })
})
