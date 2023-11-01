//
// Copyright 2023 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { afterEach, describe, it } from 'mocha'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'
import { InMemoryTokenRepository } from 'helix-auth-svc/lib/features/admin/data/repositories/InMemoryTokenRepository.js'
import DeleteWebToken from 'helix-auth-svc/lib/features/admin/domain/usecases/DeleteWebToken.js'
import RegisterWebToken from 'helix-auth-svc/lib/features/admin/domain/usecases/RegisterWebToken.js'
import VerifyWebToken from 'helix-auth-svc/lib/features/admin/domain/usecases/VerifyWebToken.js'
import WebTokenStrategy from 'helix-auth-svc/lib/features/admin/presentation/strategies/WebTokenStrategy.js'

describe('WebTokenStrategy', function () {
  const settingsRepository = new MapSettingsRepository()
  const tokenRepository = new InMemoryTokenRepository({ settingsRepository })
  const deleteWebToken = DeleteWebToken({ tokenRepository })
  const registerWebToken = RegisterWebToken({ settingsRepository, tokenRepository })
  const verifyWebToken = VerifyWebToken({ settingsRepository, tokenRepository })
  const strategy = WebTokenStrategy({ verifyWebToken })

  afterEach(function () {
    settingsRepository.clear()
  })

  it('should raise an error for invalid input', function () {
    assert.throws(() => WebTokenStrategy({ verifyWebToken: null }), AssertionError)
  })

  it('should return error token is not a valid token', function (done) {
    // arrange
    // act
    strategy._verify('notavalidtokenatall', (err) => {
      // assert
      assert.equal(err.message, 'invalid json web token')
      done()
    })
  })

  it('should return false if token not found', function (done) {
    // arrange
    settingsRepository.set('TOKEN_TTL', 300)
    // act
    registerWebToken().then((token) => {
      verifyWebToken(token).then((payload) => {
        deleteWebToken(payload).then(() => {
          strategy._verify(token, (err, payload) => {
            // assert
            assert.isNull(err)
            assert.isFalse(payload)
            done()
          })
        })
      })
    })
  })

  it('should return decoded payload if matching token', function (done) {
    // arrange
    settingsRepository.set('TOKEN_TTL', 300)
    // act
    registerWebToken().then((token) => {
      strategy._verify(token, (err, payload, extra) => {
        // assert
        assert.isNull(err)
        assert.property(payload, 'aud')
        assert.property(payload, 'exp')
        assert.property(payload, 'iat')
        assert.propertyVal(payload, 'iss', 'https://localhost:3000')
        assert.propertyVal(extra, 'scope', 'all')
        done()
      })
    })
  })
})
