//
// Copyright 2023 Perforce Software
//
import { AssertionError } from 'node:assert'
import * as fs from 'node:fs/promises'
import { assert } from 'chai'
import { afterEach, describe, it } from 'mocha'
import { temporaryFile } from 'tempy'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'
import GetProvisioningDomains from 'helix-auth-svc/lib/features/scim/domain/usecases/GetProvisioningDomains.js'

describe('GetProvisioningDomains use case', function () {
  const settingsRepository = new MapSettingsRepository()
  const usecase = GetProvisioningDomains({ settingsRepository })

  afterEach(function () {
    settingsRepository.clear()
  })

  it('should raise an error for invalid input', function () {
    assert.throws(() => GetProvisioningDomains({ settingsRepository: null }), AssertionError)
  })

  it('should return [] when no domains available', async function () {
    // arrange
    // act
    const results = await usecase()
    // assert
    assert.isEmpty(results)
  })

  it('should return the one domain via text-based token', async function () {
    // arrange
    settingsRepository.set('BEARER_TOKEN', 'keyboard cat')
    // act
    const results = await usecase()
    // assert
    assert.lengthOf(results, 1)
    assert.equal(results[0].bearerToken, 'keyboard cat')
  })

  it('should return the one domain via file-based token', async function () {
    // arrange
    const tokenFile = temporaryFile({ extension: 'txt' })
    await fs.writeFile(tokenFile, 'keyboard cat')
    settingsRepository.set('BEARER_TOKEN_FILE', tokenFile)
    // act
    const results = await usecase()
    // assert
    assert.lengthOf(results, 1)
    assert.equal(results[0].bearerToken, 'keyboard cat')
  })

  it('should raise error if missing providers list', async function () {
    // arrange
    settingsRepository.set('PROVISIONING', {
      foobar: 'something is wrong'
    })
    // act
    try {
      await usecase()
      assert.fail('should have failed')
    } catch (err) {
      // assert
      assert.equal(err.message, 'missing providers list in provisioning')
    }
  })

  it('should raise error if providers is not a list', async function () {
    // arrange
    settingsRepository.set('PROVISIONING', {
      providers: 'something is wrong'
    })
    // act
    try {
      await usecase()
      assert.fail('should have failed')
    } catch (err) {
      // assert
      assert.equal(err.message, 'provisioning providers must be a list')
    }
  })

  it('should raise error if provider without bearer token', async function () {
    // arrange
    settingsRepository.set('PROVISIONING', {
      providers: [
        { domain: 'canine' }
      ]
    })
    // act
    try {
      await usecase()
      assert.fail('should have failed')
    } catch (err) {
      // assert
      assert.include(err.message, 'missing bearer token')
    }
  })

  it('should raise error if domain is not alphanumeric', async function () {
    // arrange
    settingsRepository.set('PROVISIONING', {
      providers: [
        { bearerToken: 'keyboard cat', domain: '-=not_valid/+' }
      ]
    })
    // act
    try {
      await usecase()
      assert.fail('should have failed')
    } catch (err) {
      // assert
      assert.include(err.message, 'must be alphanumeric')
    }
  })

  it('should raise error if domain appears more than once', async function () {
    // arrange
    settingsRepository.set('PROVISIONING', {
      providers: [
        { bearerToken: 'keyboard cat', domain: 'canine' },
        { bearerToken: 'frisbee dog', domain: 'canine' }
      ]
    })
    // act
    try {
      await usecase()
      assert.fail('should have failed')
    } catch (err) {
      // assert
      assert.equal(err.message, 'domain canine already exists')
    }
  })

  it('should raise error if bearer token is reused', async function () {
    // arrange
    settingsRepository.set('PROVISIONING', {
      providers: [
        { bearerToken: 'keyboard cat', domain: 'canine' },
        { bearerToken: 'keyboard cat', domain: 'feline' }
      ]
    })
    // act
    try {
      await usecase()
      assert.fail('should have failed')
    } catch (err) {
      // assert
      assert.equal(err.message, 'multiple providers using the same token')
    }
  })

  it('should raise error if provider without domain', async function () {
    // arrange
    settingsRepository.set('PROVISIONING', {
      providers: [
        { bearerToken: 'keyboard cat' }
      ]
    })
    // act
    try {
      await usecase()
      assert.fail('should have failed')
    } catch (err) {
      // assert
      assert.include(err.message, 'missing domain')
    }
  })

  it('should return list of vetted providers', async function () {
    // arrange
    const tokenFile = temporaryFile({ extension: 'txt' })
    await fs.writeFile(tokenFile, 'frisbee dog')
    settingsRepository.set('PROVISIONING', {
      providers: [
        { bearerTokenFile: tokenFile, domain: 'canine' },
        { bearerToken: 'keyboard cat', domain: 'feline' }
      ]
    })
    // act
    const results = await usecase()
    assert.lengthOf(results, 2)
    assert.equal(results[0].domain, 'canine')
    assert.equal(results[1].domain, 'feline')
    assert.equal(results[0].bearerToken, 'frisbee dog')
    assert.equal(results[1].bearerToken, 'keyboard cat')
  })
})
