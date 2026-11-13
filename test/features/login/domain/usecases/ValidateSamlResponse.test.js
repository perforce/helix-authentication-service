//
// Copyright 2024 Perforce Software
//
import * as fs from 'node:fs'
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { describe, it } from 'mocha'
import GenerateSamlResponse from 'helix-auth-svc/lib/features/login/domain/usecases/GenerateSamlResponse.js'
import ValidateSamlResponse from 'helix-auth-svc/lib/features/login/domain/usecases/ValidateSamlResponse.js'
import { InMemoryAssertionRepository } from 'helix-auth-svc/lib/features/login/data/repositories/InMemoryAssertionRepository.js'

const options = {
  cert: fs.readFileSync('certs/server.crt', 'utf-8'),
  key: fs.readFileSync('certs/server.key', 'utf-8'),
  issuer: 'urn:auth-service:idp',
  idpCert: fs.readFileSync('certs/server.crt', 'utf-8'),
  callbackUrl: 'https://has.example.com:3000/callback',
  audience: 'urn:example:sp',
}

function makeUsecase (idpConfig = { 'urn:example:sp': { acsUrl: 'https://sp.example.com/acs' } }) {
  return ValidateSamlResponse({
    getIdPConfiguration: async () => idpConfig,
    assertionRepository: new InMemoryAssertionRepository()
  })
}

async function generateResponse (requestId, audience = options.audience) {
  const generate = GenerateSamlResponse()
  const response = await generate({ nameID: 'joe@example.com' }, { ...options, audience }, requestId)
  return { SAMLResponse: Buffer.from(response, 'utf-8').toString('base64') }
}

describe('ValidateSamlResponse use case', function () {
  it('should raise an error for invalid input', async function () {
    assert.throws(() => ValidateSamlResponse({ getIdPConfiguration: null, assertionRepository: {} }), AssertionError)
    assert.throws(() => ValidateSamlResponse({ getIdPConfiguration: {}, assertionRepository: null }), AssertionError)
    const usecase = makeUsecase()
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
    const usecase = makeUsecase()
    const body = await generateResponse('request123')
    assert.include(Buffer.from(body.SAMLResponse, 'base64').toString(), 'SessionIndex="request123"')
    // act
    const result = await usecase(options, body)
    // assert
    assert.equal(result.profile.nameID, 'joe@example.com')
    assert.equal(result.requestId, 'request123')
  })

  it('should reject a response that has already been used (HAS-734)', async function () {
    // arrange
    const usecase = makeUsecase()
    const body = await generateResponse('request456')
    await usecase(options, body)
    try {
      // act
      await usecase(options, body)
      assert.fail('should have raised error')
    } catch (err) {
      // assert
      assert.include(err.message, 'already been used')
    }
  })

  it('should reject an audience not in the IdP configuration (HAS-734)', async function () {
    // arrange
    const usecase = makeUsecase()
    const body = await generateResponse('request789', 'urn:other:sp')
    try {
      // act
      await usecase(options, body)
      assert.fail('should have raised error')
    } catch (err) {
      // assert
      assert.include(err.message, 'audience not permitted: urn:other:sp')
    }
  })

  it('should accept an audience matching a glob in the IdP configuration', async function () {
    // arrange
    const usecase = makeUsecase({ 'urn:swarm-*:sp': { acsUrl: 'https://swarm.example.com/acs' } })
    const body = await generateResponse('request321', 'urn:swarm-chicago:sp')
    // act
    const result = await usecase(options, body)
    // assert
    assert.equal(result.requestId, 'request321')
  })
})
