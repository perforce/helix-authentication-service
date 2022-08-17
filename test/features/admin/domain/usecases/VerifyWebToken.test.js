//
// Copyright 2022 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { before, beforeEach, describe, it } from 'mocha'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'
import { InMemoryTokenRepository } from 'helix-auth-svc/lib/features/admin/data/repositories/InMemoryTokenRepository.js'
import RegisterWebToken from 'helix-auth-svc/lib/features/admin/domain/usecases/RegisterWebToken.js'
import VerifyWebToken from 'helix-auth-svc/lib/features/admin/domain/usecases/VerifyWebToken.js'

describe('VerifyWebToken use case', function () {
  const settings = new Map()
  let getToken
  let usecase

  before(function () {
    const tokenTtl = 10000
    const settingsRepository = new MapSettingsRepository(settings)
    const tokenRepository = new InMemoryTokenRepository({ tokenTtl })
    usecase = VerifyWebToken({ settingsRepository, tokenRepository })
    getToken = RegisterWebToken({ settingsRepository, tokenRepository, tokenTtl })
  })

  beforeEach(function () {
    settings.clear()
  })

  it('should raise an error for invalid input', async function () {
    assert.throws(() => VerifyWebToken({ settingsRepository: null, tokenRepository: {} }), AssertionError)
    assert.throws(() => VerifyWebToken({ settingsRepository: {}, tokenRepository: null }), AssertionError)
    try {
      await usecase(null)
      assert.fail('should have raised error')
    } catch (err) {
      assert.instanceOf(err, AssertionError)
    }
  })

  it('should approve a valid JSON web token', async function () {
    // arrange
    settings.set('SVC_BASE_URI', 'https://localhost:3000')
    const token = await getToken()
    // act
    const result = await usecase(token)
    // assert
    assert.property(result, 'aud')
  })

  it('should reject malformed web token', async function () {
    // arrange
    settings.set('SVC_BASE_URI', 'https://localhost:3000')
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

  it('should reject JWT with algorithm "none"', async function () {
    // arrange
    settings.set('SVC_BASE_URI', 'https://localhost:3000')
    const header = base64json({ alg: 'none' })
    const payload = base64json({ aud: '719d88f3-f957-44cf-9aa5-0a1a3a44f7b9' })
    const token = header + '.' + payload + '.'
    try {
      // act
      await usecase(token)
      assert.fail('should have raised error')
    } catch (err) {
      // assert
      assert.include(err.message, 'jwt signature is required')
    }
  })

  it('should reject JWT with missing signature', async function () {
    // arrange
    settings.set('SVC_BASE_URI', 'https://localhost:3000')
    const fullToken = await getToken()
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

  it('should reject JWT header with bad JSON', async function () {
    // arrange
    settings.set('SVC_BASE_URI', 'https://localhost:3000')
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

  it('should reject web token signed by another party', async function () {
    // arrange
    settings.set('SVC_BASE_URI', 'https://localhost:3000')
    const token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6Ik1yNS1BVWliZkJpaTdOZDFqQmViYXhib1hXMCIsImtpZCI6Ik1yNS1BVWliZkJpaTdOZDFqQmViYXhib1hXMCJ9.eyJhdWQiOiJhcGk6Ly8yNWIxN2NkYi00YzhkLTQzNGMtOWEyMS04NmQ2N2FjNTAxZDEiLCJpc3MiOiJodHRwczovL3N0cy53aW5kb3dzLm5ldC83MTlkODhmMy1mOTU3LTQ0Y2YtOWFhNS0wYTFhM2E0NGY3YjkvIiwiaWF0IjoxNjQwMDM4OTY2LCJuYmYiOjE2NDAwMzg5NjYsImV4cCI6MTY0MDEyNTY2NiwiYWlvIjoiRTJaZ1lLaStuWnA3NmQ0TDdRc0Y2Zzk1TGF3NUFBPT0iLCJhcHBpZCI6ImYzNjRmZjE3LTllNDItNGY3ZS1iNzAwLTExZTE5YmEyYWM2ZiIsImFwcGlkYWNyIjoiMiIsImlkcCI6Imh0dHBzOi8vc3RzLndpbmRvd3MubmV0LzcxOWQ4OGYzLWY5NTctNDRjZi05YWE1LTBhMWEzYTQ0ZjdiOS8iLCJvaWQiOiI0ZGJkZjQ1MC05NThkLTRjNjQtODhiMi1hYmJhMmU0NmYxZmYiLCJyaCI6IjAuQVN3QTg0aWRjVmY1ejBTYXBRb2FPa1QzdVJmX1pQTkNubjVQdHdBUjRadWlyRzhzQUFBLiIsInJvbGVzIjpbIlBlcmZvcmNlLkNhbGwiXSwic3ViIjoiNGRiZGY0NTAtOTU4ZC00YzY0LTg4YjItYWJiYTJlNDZmMWZmIiwidGlkIjoiNzE5ZDg4ZjMtZjk1Ny00NGNmLTlhYTUtMGExYTNhNDRmN2I5IiwidXRpIjoiNm5XeVVFbjJGMC00OVlVNG02bDBBQSIsInZlciI6IjEuMCJ9.fS2f3IoYxr2VlJd4BCxT4o3ikqdyjJY1AGVRe7-tBWmpZSbyKOAs39WIYReWp5vMShW1JKv_r37bYSMbIHhz0bfKM-OkQELEdOsfVoBbywkXSoxCoGXAj5q1RxuCPUEnX59UlgCNa2_Z6Rc765O9BSz7BbYBlaW2Bh6OIzTywBW2Lyn987PxiewsIECSUCP_v4lY9VsS5PUo3iQgAygQ1qUQQf3FKunZhL8SOYuz-PcGpkZqC9F8FCah3wMbyekfLu5Tjhujg7lL_RiBgQqkRjXc5WZDft0md4j-4zGQDmPCE73NP2Xh-9mkpu8cZFw-lz-wOZ8SXF43yjfpy1CxSQ'
    // act
    const result = await usecase(token)
    // assert
    assert.isNull(result)
  })
})

function base64json(value) {
  const s = Buffer.from(JSON.stringify(value), 'utf-8').toString('base64')
  return s.replace(/=+$/, '');
}
