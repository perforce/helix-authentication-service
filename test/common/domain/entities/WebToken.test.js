//
// Copyright 2022 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { describe, it } from 'mocha'
import { WebToken } from 'helix-auth-svc/lib/common/domain/entities/WebToken.js'

describe('Web Token', function () {
  it('should raise an error for invalid input', function () {
    assert.throws(() => new WebToken(null), AssertionError)
    assert.throws(() => new WebToken('foo', null), AssertionError)
    assert.throws(() => new WebToken('foo', 'bar', null), AssertionError)
  })

  it('should parse valid JSON web token', function () {
    // arrange
    const raw = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6Ik1yNS1BVWliZkJpaTdOZDFqQmViYXhib1hXMCIsImtpZCI6Ik1yNS1BVWliZkJpaTdOZDFqQmViYXhib1hXMCJ9.eyJhdWQiOiJhcGk6Ly8yNWIxN2NkYi00YzhkLTQzNGMtOWEyMS04NmQ2N2FjNTAxZDEiLCJpc3MiOiJodHRwczovL3N0cy53aW5kb3dzLm5ldC83MTlkODhmMy1mOTU3LTQ0Y2YtOWFhNS0wYTFhM2E0NGY3YjkvIiwiaWF0IjoxNjQwMDM4OTY2LCJuYmYiOjE2NDAwMzg5NjYsImV4cCI6MTY0MDEyNTY2NiwiYWlvIjoiRTJaZ1lLaStuWnA3NmQ0TDdRc0Y2Zzk1TGF3NUFBPT0iLCJhcHBpZCI6ImYzNjRmZjE3LTllNDItNGY3ZS1iNzAwLTExZTE5YmEyYWM2ZiIsImFwcGlkYWNyIjoiMiIsImlkcCI6Imh0dHBzOi8vc3RzLndpbmRvd3MubmV0LzcxOWQ4OGYzLWY5NTctNDRjZi05YWE1LTBhMWEzYTQ0ZjdiOS8iLCJvaWQiOiI0ZGJkZjQ1MC05NThkLTRjNjQtODhiMi1hYmJhMmU0NmYxZmYiLCJyaCI6IjAuQVN3QTg0aWRjVmY1ejBTYXBRb2FPa1QzdVJmX1pQTkNubjVQdHdBUjRadWlyRzhzQUFBLiIsInJvbGVzIjpbIlBlcmZvcmNlLkNhbGwiXSwic3ViIjoiNGRiZGY0NTAtOTU4ZC00YzY0LTg4YjItYWJiYTJlNDZmMWZmIiwidGlkIjoiNzE5ZDg4ZjMtZjk1Ny00NGNmLTlhYTUtMGExYTNhNDRmN2I5IiwidXRpIjoiNm5XeVVFbjJGMC00OVlVNG02bDBBQSIsInZlciI6IjEuMCJ9.fS2f3IoYxr2VlJd4BCxT4o3ikqdyjJY1AGVRe7-tBWmpZSbyKOAs39WIYReWp5vMShW1JKv_r37bYSMbIHhz0bfKM-OkQELEdOsfVoBbywkXSoxCoGXAj5q1RxuCPUEnX59UlgCNa2_Z6Rc765O9BSz7BbYBlaW2Bh6OIzTywBW2Lyn987PxiewsIECSUCP_v4lY9VsS5PUo3iQgAygQ1qUQQf3FKunZhL8SOYuz-PcGpkZqC9F8FCah3wMbyekfLu5Tjhujg7lL_RiBgQqkRjXc5WZDft0md4j-4zGQDmPCE73NP2Xh-9mkpu8cZFw-lz-wOZ8SXF43yjfpy1CxSQ'
    // act
    const token = WebToken.fromRaw(raw)
    // assert
    assert.isNotNull(token)
    assert.equal(token.audience, 'api://25b17cdb-4c8d-434c-9a21-86d67ac501d1')
    assert.equal(token.keyid, 'Mr5-AUibfBii7Nd1jBebaxboXW0')
  })

  it('should reject token without dots', function () {
    // arrange
    const raw = 'notavalidtokenatall'
    try {
      // act
      WebToken.fromRaw(raw)
      assert.fail('should have raised error')
    } catch (err) {
      // assert
      assert.include(err.message, 'invalid json web token')
    }
  })

  it('should reject token header with bad JSON', function () {
    // arrange
    const raw = 'dGhpc2lzbm90anNvbg.eyJ1c2VyIjogImpvaG4ifQ.'
    try {
      // act
      WebToken.fromRaw(raw)
      assert.fail('should have raised error')
    } catch (err) {
      // assert
      assert.include(err.message, 'malformed json web token')
    }
  })

  it('should reject token with missing signature', function () {
    // arrange
    const raw = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImE0MjIwYWNhLWExODItNDlmMC05ODBjLTc2ZTI1MDRjNmFjZiJ9.eyJzdWIiOiI4ZTczNDFhZC1jYmE2LTRmNmYtODA2MS04OGI4YjE4ZDM4ODUiLCJ0aWQiOiI3MTlkODhmMy1mOTU3LTQ0Y2YtOWFhNS0wYTFhM2E0NGY3YjkiLCJhdWQiOiJhcGk6Ly8yNWIxN2NkYi00YzhkLTQzNGMtOWEyMS04NmQ2N2FjNTAxZDEiLCJpYXQiOjE2NTg3OTIyNjksImlzcyI6Imh0dHA6Ly9qd3QuZG9jOjMwMDAvIn0.'
    try {
      // act
      WebToken.fromRaw(raw)
      assert.fail('should have raised error')
    } catch (err) {
      // assert
      assert.include(err.message, 'jwt signature is required')
    }
  })
})
