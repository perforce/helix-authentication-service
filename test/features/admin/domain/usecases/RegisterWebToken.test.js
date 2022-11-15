//
// Copyright 2022 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { after, before, describe, it } from 'mocha'
import sinon from 'sinon'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'
import { TokenRepository } from 'helix-auth-svc/lib/features/admin/domain/repositories/TokenRepository.js'
import RegisterWebToken from 'helix-auth-svc/lib/features/admin/domain/usecases/RegisterWebToken.js'

describe('RegisterWebToken use case', function () {
  const settings = new Map()
  let usecase

  before(function () {
    settings.set('TOKEN_TTL', '10')
    const settingsRepository = new MapSettingsRepository(settings)
    const tokenRepository = new TokenRepository()
    usecase = RegisterWebToken({ settingsRepository, tokenRepository })
  })

  after(function () {
    sinon.restore()
  })

  it('should raise an error for invalid input', async function () {
    assert.throws(() => RegisterWebToken({ settingsRepository: null, tokenRepository: {} }), AssertionError)
    assert.throws(() => RegisterWebToken({ settingsRepository: {}, tokenRepository: null }), AssertionError)
  })

  it('should generate a token', async function () {
    // arrange
    const setStub = sinon.stub(TokenRepository.prototype, 'set').callsFake((audience, secret) => {
      assert.isString(audience)
      assert.isString(secret)
    })
    // act
    const token = await usecase()
    // assert
    assert.isString(token)
    assert.isTrue(setStub.calledOnce)
    setStub.restore()
  })
})
