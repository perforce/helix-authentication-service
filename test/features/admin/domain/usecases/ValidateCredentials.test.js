//
// Copyright 2022 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { describe, it } from 'mocha'
import ValidateCredentials from 'helix-auth-svc/lib/features/admin/domain/usecases/ValidateCredentials.js'

describe('ValidateCredentials use case', function () {
  it('should raise an error for invalid input', async function () {
    assert.throws(() => ValidateCredentials({ credentialsRepository: null }), AssertionError)
    const usecase = ValidateCredentials({ credentialsRepository: 'foobar' })
    try {
      await usecase(null)
      assert.fail('should have raised error')
    } catch (err) {
      assert.instanceOf(err, AssertionError)
    }
    try {
      await usecase('scott', null)
      assert.fail('should have raised error')
    } catch (err) {
      assert.instanceOf(err, AssertionError)
    }
  })

  it('should return true for matching credentials', async function () {
    // arrange
    const credsRepo = {
      verify (username, password) {
        return username === 'scott' && password === 'tiger'
      }
    }
    const usecase = ValidateCredentials({ credentialsRepository: credsRepo })
    // act
    const result = await usecase('scott', 'tiger')
    // assert
    assert.isTrue(result)
  })

  it('should return false for non-matching credentials', async function () {
    // arrange
    const credsRepo = {
      verify(username, password) {
        return username === 'scott' && password === 'tiger'
      }
    }
    const usecase = ValidateCredentials({ credentialsRepository: credsRepo })
    // act
    const result = await usecase('susan', 'lioness')
    // assert
    assert.isFalse(result)
  })
})
