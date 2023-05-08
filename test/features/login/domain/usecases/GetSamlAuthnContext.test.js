//
// Copyright 2023 Perforce Software
//
import { assert } from 'chai'
import { describe, it } from 'mocha'
import GetSamlAuthnContext from 'helix-auth-svc/lib/features/login/domain/usecases/GetSamlAuthnContext.js'

describe('GetSamlAuthnContext use case', function () {
  const usecase = GetSamlAuthnContext()

  it('should return undefined if content is not given', function () {
    // act
    const result = usecase()
    // assert
    assert.isUndefined(result)
  })

  it('should prefer passed parameter value over configuration', function () {
    // arrange
    // act
    const result = usecase('urn:oasis:names:tc:SAML:2.0:ac:classes:Kerberos')
    // assert
    assert.isDefined(result)
    assert.lengthOf(result, 1)
    assert.equal(result[0], 'urn:oasis:names:tc:SAML:2.0:ac:classes:Kerberos')
  })

  it('should return a singleton list even with plain string', function () {
    // arrange
    // act
    const result = usecase('urn:oasis:names:tc:SAML:2.0:ac:classes:Password')
    // assert
    assert.isDefined(result)
    assert.lengthOf(result, 1)
    assert.equal(result[0], 'urn:oasis:names:tc:SAML:2.0:ac:classes:Password')
  })

  it('should return a list if multiple values inside brackets', function () {
    // arrange
    // act
    const result = usecase(`"[ ' urn:oasis:names:tc:SAML:2.0:ac:classes:Kerberos', 'urn:oasis:names:tc:SAML:2.0:ac:classes:Password' ]"`)
    // assert
    assert.isDefined(result)
    assert.lengthOf(result, 2)
    assert.equal(result[0], 'urn:oasis:names:tc:SAML:2.0:ac:classes:Kerberos')
    assert.equal(result[1], 'urn:oasis:names:tc:SAML:2.0:ac:classes:Password')
  })

  it('should leave an array value as-is', function () {
    // arrange
    // act
    const result = usecase([
      'urn:oasis:names:tc:SAML:2.0:ac:classes:Kerberos',
      'urn:oasis:names:tc:SAML:2.0:ac:classes:Password'
    ])
    // assert
    assert.isDefined(result)
    assert.lengthOf(result, 2)
    assert.equal(result[0], 'urn:oasis:names:tc:SAML:2.0:ac:classes:Kerberos')
    assert.equal(result[1], 'urn:oasis:names:tc:SAML:2.0:ac:classes:Password')
  })

  it('should ignore empty list entries', function () {
    // arrange
    // act
    const result = usecase(`"[urn:oasis:names:tc:SAML:2.0:ac:classes:Kerberos,,'urn:oasis:names:tc:SAML:2.0:ac:classes:Password',]"`)
    // assert
    assert.isDefined(result)
    assert.lengthOf(result, 2)
    assert.equal(result[0], 'urn:oasis:names:tc:SAML:2.0:ac:classes:Kerberos')
    assert.equal(result[1], 'urn:oasis:names:tc:SAML:2.0:ac:classes:Password')
  })

  it('should trim mismatched quotes and brackets from list entries', function () {
    // arrange
    // act
    const result = usecase(`"['urn:oasis:names:tc:SAML:2.0:ac:classes:Kerberos,'urn:oasis:names:tc:SAML:2.0:ac:classes:Password']`)
    // assert
    assert.isDefined(result)
    assert.lengthOf(result, 2)
    assert.equal(result[0], 'urn:oasis:names:tc:SAML:2.0:ac:classes:Kerberos')
    assert.equal(result[1], 'urn:oasis:names:tc:SAML:2.0:ac:classes:Password')
  })
})
