//
// Copyright 2022 Perforce Software
//
import * as fs from 'node:fs'
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { describe, it } from 'mocha'
import GenerateSamlResponse from 'helix-auth-svc/lib/features/login/domain/usecases/GenerateSamlResponse.js'

describe('GenerateSamlResponse use case', function () {
  it('should raise an error for invalid input', async function () {
    const usecase = GenerateSamlResponse()
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
    try {
      await usecase('not-null', 'not-null', null)
      assert.fail('should have raised error')
    } catch (err) {
      assert.instanceOf(err, AssertionError)
    }
  })

  it('should raise error for missing nameID', async function () {
    const usecase = GenerateSamlResponse()
    const options = {
      cert: fs.readFileSync('certs/server.crt', 'utf-8'),
      key: fs.readFileSync('certs/server.key', 'utf-8'),
    }
    const user = {
      username: 'joe@example.com'
    }
    try {
      await usecase(user, options, 'request123')
      assert.fail('should have raised error')
    } catch (err) {
      assert.include(err.toString(), 'No attribute was found to generate the nameIdentifier.')
    }
  })

  it('should produce response with minimal input', async function () {
    // arrange
    const usecase = GenerateSamlResponse()
    // act
    const options = {
      cert: fs.readFileSync('certs/server.crt', 'utf-8'),
      key: fs.readFileSync('certs/server.key', 'utf-8'),
    }
    const user = {
      nameID: 'joe@example.com'
    }
    const result = await usecase(user, options, 'request123')
    // assert
    assert.include(result, 'SessionIndex="request123"')
  })

  it('should produce response with typical input', async function () {
    // arrange
    const usecase = GenerateSamlResponse()
    // act
    const options = {
      cert: fs.readFileSync('certs/server.crt', 'utf-8'),
      key: fs.readFileSync('certs/server.key', 'utf-8'),
      issuer: 'urn:auth-service:idp',
      redirectEndpointPath: '/saml/login',
      postEndpointPath: '/saml/login',
      logoutEndpointPaths: {
        redirect: '/saml/logout'
      },
      audience: 'urn:example:sp',
      destination: 'https://app.example.com',
      recipient: 'https://app.example.com',
      inResponseTo: '1234567890',
      authnContextClassRef: 'urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport',
      sessionIndex: undefined,
      nameIdentifierFormat: '',
      includeAttributeNameFormat: true
    }
    const user = {
      nameID: 'joe@example.com',
      given_name: 'Joseph',
      family_name: 'Kafka'
    }
    const result = await usecase(user, options, 'request123')
    // assert
    assert.include(result, '>Joseph<')
    assert.include(result, '>Kafka<')
    assert.include(result, 'SessionIndex="request123"')
  })
})
