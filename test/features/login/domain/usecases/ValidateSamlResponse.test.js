//
// Copyright 2024 Perforce Software
//
import * as fs from 'node:fs'
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { describe, it } from 'mocha'
import GenerateSamlResponse from 'helix-auth-svc/lib/features/login/domain/usecases/GenerateSamlResponse.js'
import ValidateSamlResponse from 'helix-auth-svc/lib/features/login/domain/usecases/ValidateSamlResponse.js'

describe('ValidateSamlResponse use case', function () {
  it('should raise an error for invalid input', async function () {
    const usecase = ValidateSamlResponse()
    try {
      await usecase(null)
      assert.fail('should have raised error')
    } catch (err) {
      assert.instanceOf(err, AssertionError)
    }
    try {
      await usecase('not-null', null)
      assert.fail('should have raised error')
    } catch (err) {
      assert.instanceOf(err, AssertionError)
    }
  })

  it('should extract user profile and request identifier', async function () {
    // arrange
    const generate = GenerateSamlResponse()
    const usecase = ValidateSamlResponse()
    const options = {
      cert: fs.readFileSync('certs/server.crt', 'utf-8'),
      key: fs.readFileSync('certs/server.key', 'utf-8'),
      issuer: 'urn:auth-service:idp',
      idpCert: fs.readFileSync('certs/server.crt', 'utf-8'),
      callbackUrl: 'https://has.example.com:3000/callback',
      audience: 'urn:example:sp',
    }
    const user = {
      nameID: 'joe@example.com'
    }
    const response = await generate(user, options, 'request123')
    assert.include(response, 'SessionIndex="request123"')
    // act
    const resp = Buffer.from(response, 'utf-8').toString('base64')
    const result = await usecase(options, { SAMLResponse: resp })
    // assert
    assert.equal(result.profile.nameID, 'joe@example.com')
    assert.equal(result.requestId, 'request123')
  })
})
