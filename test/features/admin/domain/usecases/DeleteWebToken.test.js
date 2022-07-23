//
// Copyright 2022 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { before, beforeEach, describe, it } from 'mocha'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'
import { InMemoryTokenRepository } from 'helix-auth-svc/lib/features/admin/data/repositories/InMemoryTokenRepository.js'
import DeleteWebToken from 'helix-auth-svc/lib/features/admin/domain/usecases/DeleteWebToken.js'
import RegisterWebToken from 'helix-auth-svc/lib/features/admin/domain/usecases/RegisterWebToken.js'
import VerifyWebToken from 'helix-auth-svc/lib/features/admin/domain/usecases/VerifyWebToken.js'

describe('DeleteWebToken use case', function () {
  const settings = new Map()
  let registerToken
  let verifyToken
  let usecase

  before(function () {
    const tokenTtl = 10000
    const settingsRepository = new MapSettingsRepository(settings)
    const tokenRepository = new InMemoryTokenRepository({ tokenTtl })
    usecase = DeleteWebToken({ tokenRepository })
    verifyToken = VerifyWebToken({ settingsRepository, tokenRepository })
    registerToken = RegisterWebToken({ settingsRepository, tokenRepository, tokenTtl })
  })

  beforeEach(function () {
    settings.clear()
  })

  it('should raise an error for invalid input', async function () {
    assert.throws(() => DeleteWebToken({ tokenRepository: null }), AssertionError)
    try {
      await usecase(null)
      assert.fail('should have raised error')
    } catch (err) {
      assert.instanceOf(err, AssertionError)
    }
  })

  it('should remove an existing web token', async function () {
    // arrange
    settings.set('SVC_BASE_URI', 'https://localhost:3000')
    const token = await registerToken()
    // act
    const found = await verifyToken(token)
    assert.property(found, 'aud')
    await usecase(token)
    // attempting to verify a token that was removed is an error
    try {
      await verifyToken(token)
      assert.fail('should have raised error')
    } catch (err) {
      // assert
      assert.include(err.message, 'token registration not found')
    }
  })

  it('should ignore repeated remove operations', async function () {
    settings.set('SVC_BASE_URI', 'https://localhost:3000')
    const token = await registerToken()
    await usecase(token)
    // does not raise error on repeated deletes
    await usecase(token)
    await usecase(token)
  })

  it('should reject malformed web token', async function () {
    // arrange
    const token = 'notavalidtokenatall'
    try {
      // act
      await usecase(token)
      assert.fail('should have raised error')
    } catch (err) {
      // assert
      assert.include(err.message, 'invalid json web token')
    }
  })

  it('should reject token with missing signature', async function () {
    // arrange
    settings.set('SVC_BASE_URI', 'https://localhost:3000')
    const fullToken = await registerToken()
    const lastDot = fullToken.lastIndexOf('.')
    const token = fullToken.substring(0, lastDot + 1)
    try {
      // act
      await usecase(token)
      assert.fail('should have raised error')
    } catch (err) {
      // assert
      assert.include(err.message, 'jwt signature is required')
    }
  })

  it('should reject token header with bad JSON', async function () {
    // arrange
    const token = 'dGhpc2lzbm90anNvbg.eyJ1c2VyIjogImpvaG4ifQ.'
    try {
      // act
      await usecase(token)
      assert.fail('should have raised error')
    } catch (err) {
      // assert
      assert.include(err.message, 'malformed json web token')
    }
  })
})
