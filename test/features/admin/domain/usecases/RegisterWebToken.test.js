//
// Copyright 2022 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { after, before, describe, it } from 'mocha'
import sinon from 'sinon'
import { SettingsRepository } from 'helix-auth-svc/lib/common/domain/repositories/SettingsRepository.js'
import { TokenRepository } from 'helix-auth-svc/lib/features/admin/domain/repositories/TokenRepository.js'
import RegisterWebToken from 'helix-auth-svc/lib/features/admin/domain/usecases/RegisterWebToken.js'

describe('RegisterWebToken use case', function () {
  let usecase

  before(function () {
    const tokenTtl = 10000
    const settingsRepository = new SettingsRepository()
    const tokenRepository = new TokenRepository()
    usecase = RegisterWebToken({ tokenTtl, settingsRepository, tokenRepository })
  })

  after(function () {
    sinon.restore()
  })

  it('should raise an error for invalid input', async function () {
    assert.throws(() => RegisterWebToken({ tokenTtl: null, settingsRepository: {}, tokenRepository: {} }), AssertionError)
    assert.throws(() => RegisterWebToken({ tokenTtl: 1000, settingsRepository: null, tokenRepository: {} }), AssertionError)
    assert.throws(() => RegisterWebToken({ tokenTtl: 1000, settingsRepository: {}, tokenRepository: null }), AssertionError)
  })

  it('should generate a token', async function () {
    // arrange
    const readStub = sinon.stub(SettingsRepository.prototype, 'get').callsFake((name) => {
      assert.equal(name, 'SVC_BASE_URI')
      return 'https://has.example.com'
    })
    const setStub = sinon.stub(TokenRepository.prototype, 'set').callsFake((audience, secret) => {
      assert.isString(audience)
      assert.isString(secret)
    })
    // act
    const token = await usecase()
    // assert
    assert.isString(token)
    assert.isTrue(readStub.calledOnce)
    assert.isTrue(setStub.calledOnce)
    readStub.restore()
    setStub.restore()
  })
})
