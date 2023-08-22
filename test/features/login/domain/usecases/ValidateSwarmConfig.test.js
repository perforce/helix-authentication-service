//
// Copyright 2023 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { beforeEach, describe, it } from 'mocha'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'
import ValidateSwarmConfig from 'helix-auth-svc/lib/features/login/domain/usecases/ValidateSwarmConfig.js'

describe('ValidateSwarmConfig use case', function () {
  const settingsRepository = new MapSettingsRepository()

  beforeEach(function () {
    settingsRepository.clear()
  })

  it('should raise an error for invalid input', async function () {
    assert.throws(() => ValidateSwarmConfig({ settingsRepository: {}, getIdPConfiguration: null }), AssertionError)
    assert.throws(() => ValidateSwarmConfig({ settingsRepository: null, getIdPConfiguration: () => false }), AssertionError)
    const usecase = ValidateSwarmConfig({ settingsRepository: {}, getIdPConfiguration: () => false })
    try {
      await usecase(null, 'present')
      assert.fail('should have raised error')
    } catch (err) {
      assert.instanceOf(err, AssertionError)
    }
    try {
      await usecase('present', null)
      assert.fail('should have raised error')
    } catch (err) {
      assert.instanceOf(err, AssertionError)
    }
  })

  it('should return errors if parsing failed', async function () {
    // arrange
    const usecase = ValidateSwarmConfig({ settingsRepository, getIdPConfiguration: () => new Object() })
    // act
    const swarmConfig = `<?php
return array(
  'name' =>
);`
    const result = await usecase('present', swarmConfig)
    // assert
    assert.equal(result.status, 'errors')
    assert.lengthOf(result.errors, 1)
    assert.isTrue(result.errors.some((e) => e.includes('expected value')))
  })

  it('should return errors if missing saml section', async function () {
    // arrange
    const usecase = ValidateSwarmConfig({ settingsRepository, getIdPConfiguration: () => new Object() })
    // act
    const swarmConfig = `<?php
return array(
  'name' => 'value'
);`
    const result = await usecase('present', swarmConfig)
    // assert
    assert.equal(result.status, 'results')
    assert.lengthOf(result.results, 1)
    assert.isTrue(result.results.some((e) => e === "missing 'saml' in configuration"))
  })

  it('should return errors if missing saml.sp section', async function () {
    // arrange
    const usecase = ValidateSwarmConfig({ settingsRepository, getIdPConfiguration: () => new Object() })
    // act
    const swarmConfig = `<?php
return array(
  'saml' => array(
    'name' => 'value'
  ),
);`
    const result = await usecase('present', swarmConfig)
    // assert
    assert.equal(result.status, 'results')
    assert.lengthOf(result.results, 1)
    assert.isTrue(result.results.some((e) => e === "missing 'saml.sp' in configuration"))
  })

  it('should return errors if spEntityId does not match', async function () {
    // arrange
    const idpConfig = {
      'urn:swarm-example:sp': {
        acsUrl: 'https://swarm.example.com/api/v10/session'
      }
    }
    const usecase = ValidateSwarmConfig({ settingsRepository, getIdPConfiguration: () => idpConfig })
    // act
    const swarmConfig = `<?php
return array(
  'saml' => array(
    'sp' => array(
      'entityId' => 'does not match',
      'assertionConsumerService' => array(
        'url' => 'present',
      ),
    ),
    'idp' => array(
      'entityId' => 'present',
      'singleSignOnService' => array(
        'url' => 'present',
      ),
      'x509cert' => 'present',
    ),
  ),
);`
    const result = await usecase('present', swarmConfig)
    // assert
    assert.equal(result.status, 'results')
    assert.lengthOf(result.results, 1)
    assert.isTrue(result.results.some((e) => e === 'saml.sp.entityId (does not match) is missing in IDP_CONFIG_FILE'))
  })

  it('should return errors if acsUrl missing from IdP config', async function () {
    // arrange
    const idpConfig = {
      'urn:swarm-example:sp': {
        fooUrl: 'present'
      }
    }
    const usecase = ValidateSwarmConfig({ settingsRepository, getIdPConfiguration: () => idpConfig })
    // act
    const swarmConfig = `<?php
return array(
  'saml' => array(
    'sp' => array(
      'entityId' => 'urn:swarm-example:sp',
      'assertionConsumerService' => array(
        'url' => 'present',
      ),
    ),
    'idp' => array(
      'entityId' => 'present',
      'singleSignOnService' => array(
        'url' => 'present',
      ),
      'x509cert' => 'present',
    ),
  ),
);`
    const result = await usecase('present', swarmConfig)
    // assert
    assert.equal(result.status, 'results')
    assert.lengthOf(result.results, 4)
    assert.isTrue(result.results.some((e) => e === "IDP_CONFIG_FILE entry for urn:swarm-example:sp is missing 'acsUrl' or 'acsUrls'"))
  })

  it('should return errors if acsUrl does not match', async function () {
    // arrange
    const idpConfig = {
      'urn:swarm-example:sp': {
        acsUrl: 'https://swarm.example.com/api/v10/session'
      }
    }
    const usecase = ValidateSwarmConfig({ settingsRepository, getIdPConfiguration: () => idpConfig })
    // act
    const swarmConfig = `<?php
return array(
  'saml' => array(
    'sp' => array(
      'entityId' => 'urn:swarm-example:sp',
      'assertionConsumerService' => array(
        'url' => 'present',
      ),
    ),
    'idp' => array(
      'entityId' => 'present',
      'singleSignOnService' => array(
        'url' => 'https://has.example.com/saml/login',
      ),
      'x509cert' => 'present',
    ),
  ),
);`
    const result = await usecase('https://has.example.com', swarmConfig)
    // assert
    assert.equal(result.status, 'results')
    assert.lengthOf(result.results, 3)
    assert.isTrue(result.results.some((e) => e.includes('saml.sp.assertionConsumerService.url must be')))
  })

  it('should return errors if saml.idp.entityId does not match', async function () {
    // arrange
    const idpConfig = {
      'urn:swarm-example:sp': {
        acsUrl: 'https://swarm.example.com/api/v10/session'
      }
    }
    const usecase = ValidateSwarmConfig({ settingsRepository, getIdPConfiguration: () => idpConfig })
    // act
    const swarmConfig = `<?php
return array(
  'saml' => array(
    'sp' => array(
      'entityId' => 'urn:swarm-example:sp',
      'assertionConsumerService' => array(
        'url' => 'https://swarm.example.com/',
      ),
    ),
    'idp' => array(
      'entityId' => 'present',
      'singleSignOnService' => array(
        'url' => 'https://has.example.com/saml/login',
      ),
      'x509cert' => 'present',
    ),
  ),
);`
    const result = await usecase('https://has.example.com', swarmConfig)
    // assert
    assert.equal(result.status, 'results')
    assert.lengthOf(result.results, 2)
    assert.isTrue(result.results.some((e) => e === 'saml.idp.entityId must be `urn:auth-service:idp`'))
  })

  it('should return errors if ssoUrl does not match', async function () {
    // arrange
    settingsRepository.set('CERT_FILE', 'certs/server.crt')
    const idpConfig = {
      'urn:swarm-example:sp': {
        acsUrl: 'https://swarm.example.com/api/v10/session'
      }
    }
    const usecase = ValidateSwarmConfig({ settingsRepository, getIdPConfiguration: () => idpConfig })
    // act
    const swarmConfig = `<?php
return array(
  'saml' => array(
    'sp' => array(
      'entityId' => 'urn:swarm-example:sp',
      'assertionConsumerService' => array(
        'url' => 'https://swarm.example.com/',
      ),
    ),
    'idp' => array(
      'entityId' => 'urn:auth-service:idp',
      'singleSignOnService' => array(
        'url' => 'https://has.example.com',
      ),
      'x509cert' => 'present',
    ),
  ),
);`
    const result = await usecase('https://has.example.com', swarmConfig)
    // assert
    assert.equal(result.status, 'results')
    assert.lengthOf(result.results, 2)
    assert.isTrue(result.results.some((e) => e.includes('saml.idp.singleSignOnService.url must be')))
  })

  it('should return errors if x509cert does not match', async function () {
    // arrange
    settingsRepository.set('CERT_FILE', 'certs/server.crt')
    const idpConfig = {
      'urn:swarm-example:sp': {
        acsUrl: 'https://swarm.example.com/api/v10/session'
      }
    }
    const usecase = ValidateSwarmConfig({ settingsRepository, getIdPConfiguration: () => idpConfig })
    // act
    const swarmConfig = `<?php
return array(
  'saml' => array(
    'sp' => array(
      'entityId' => 'urn:swarm-example:sp',
      'assertionConsumerService' => array(
        'url' => 'https://swarm.example.com/',
      ),
    ),
    'idp' => array(
      'entityId' => 'urn:auth-service:idp',
      'singleSignOnService' => array(
        'url' => 'https://has.example.com/saml/login',
      ),
      'x509cert' => 'present',
    ),
  ),
);`
    const result = await usecase('https://has.example.com', swarmConfig)
    // assert
    assert.equal(result.status, 'results')
    assert.lengthOf(result.results, 1)
    assert.isTrue(result.results.some((e) => e === 'saml.idp.x509cert does not match contents of CERT_FILE'))
  })

  it('should indicate success if everything is okay', async function () {
    // arrange
    settingsRepository.set('CERT_FILE', 'certs/server.crt')
    const idpConfig = {
      'urn:swarm-example:sp': {
        acsUrl: 'https://swarm.example.com/api/v10/session'
      }
    }
    const usecase = ValidateSwarmConfig({ settingsRepository, getIdPConfiguration: () => idpConfig })
    // act
    const swarmConfig = `<?php
return array(
  'saml' => array(
    'sp' => array(
      'entityId' => 'urn:swarm-example:sp',
      'assertionConsumerService' => array(
        'url' => 'https://swarm.example.com/',
      ),
    ),
    'idp' => array(
      'entityId' => 'urn:auth-service:idp',
      'singleSignOnService' => array(
        'url' => 'https://has.example.com/saml/login',
      ),
      'x509cert' => '-----BEGIN CERTIFICATE-----
MIIEoTCCAokCAQEwDQYJKoZIhvcNAQELBQAwGDEWMBQGA1UEAwwNRmFrZUF1dGhv
cml0eTAeFw0yMTExMDgyMjE1MzRaFw0zMTExMDYyMjE1MzRaMBUxEzARBgNVBAMM
CmF1dGhlbi5kb2MwggIiMA0GCSqGSIb3DQEBAQUAA4ICDwAwggIKAoICAQDC0Whu
jXOzgiKRBFtu38BgQ+hujR0UGUS2DvbrTzHCODyFGudvjTXLKp+Ms/4okfuvWdcz
PK5h0vy1lO/INlNDchRytIhrws9mIY9wuLJW3tgocDF2WARiON6ZABMx/JC2Qcs/
/K8gu0KIbxa8r7jfCs9YChOuqG7CD3JuXZVv9TKgoPgXTYCu/LbNxpm92hBRyffJ
K+DSdvdRnvnMrvR5LbED4Pk+k0DMXOtypgoC9KIvciIVS8TGPdpcyXxUg1ba7nik
TgwaOvywYKJHyY46gFcRSq8CDlcRPAGzDubneT1r2K0LmshWTB8fg+2XgcbTLSGy
it+Q6zRogU7ts/8dNk7wN1iGbP7jqrGYCUBZpnu97pNFFaHEB/2KZfNdIRF6ARJO
4bwXnXeNEIxWV6mARvFvSVfeISu09NfZCQuY1WGiO7dgfOb3OLpnEun6VpkwRJ9m
rZ6a4l2yHYCJTUlQchYbAzz40Ye2U1eW9UB0OMyXAbhPIIblNf8Uic8mDo98mG63
jdl+xrC9J1EbUej9v9NaqSfP09Pi6fgt3f6itCdoFaUgDJNrcCgKE09X4uvjL+sV
ISdBXE+C0ODMACCnpjnJ5QFHu+KoDsqdbArnm/cLU6Ck0wyOI72DqAuWR/SYXgkO
P0AA8LDbKQo00/rbEr5SRv+ya4MlaW4vkB7qGwIDAQABMA0GCSqGSIb3DQEBCwUA
A4ICAQBvjCCs8Xsi0U7KSrXq9q7Ysht7Jf+3a5JaA2gHU40CYIqRlReX3bcHAra5
2eZu77pazxDDtlWQtdv2C0P4l5hl+IhaUipDNQEciYcVBsJp2Lizedla0IEgfyEv
cJrvaULHRaNVhOkM2MJNE1xsP0yF34aXR85nmJ7K8qqHaxDokAyMqbVOwQW3nTaM
cvpesfaRwE8+eIjohMFEyuc+qpV1titjXueQ9GulkSX20tsiOmnl3KtY3VGCTrXs
mbbL46utMifkhYG6B3aQbcl16SeQth0Bihc9xfJHzrigwb4l+cfJe3eUPPclvTOs
2eWKcuMxAipmCir52Lr1WIFzIkAn2UqP4aZo8+MM2bsOGI09dNUmflg/ZyI+F5tl
kD5+gkn5fXwfQuVScYH7ecOIZhCvtsE0+FgqdMx5rkBKdxpGQqd8JpR6ENfJc2y6
okBJ30ZSXKIpBXz8dDlSwDwA5dpICW8YR6aTQuWgriadXS6Abni2gsx1sAPpt7bg
svjqwGB+wnqvD7+oCjH3/kLKTgm6Rh8NMViS/O7kyIa+8B7lw2EhTb6yySxVZgs5
gTw6pzhEX/3xGwgDOn4UK4gzk2xAkAUsh0IQNnfcj13P6VqslVLcI/2mqKT72Quo
MZXNWXiBpf4CRHvtHBOD7Jae4d7mlqAZp9JUHbVxTv4lHT3fcw==
-----END CERTIFICATE-----',
    ),
  ),
);`
    const result = await usecase('https://has.example.com', swarmConfig)
    // assert
    assert.equal(result.status, 'ok')
    assert.lengthOf(result.results, 0)
  })

  it('should match an ACS URL against a list', async function () {
    // arrange
    settingsRepository.set('CERT_FILE', 'certs/server.crt')
    const idpConfig = {
      'urn:swarm-example:sp': {
        acsUrls: [
          'https://swarm.foobar.com/api/v10/session',
          'https://swarm.hosting.com/api/v10/session',
          'https://swarm.example.com/api/v10/session'
        ]
      }
    }
    const usecase = ValidateSwarmConfig({ settingsRepository, getIdPConfiguration: () => idpConfig })
    // act
    const swarmConfig = `<?php
return array(
  'saml' => array(
    'sp' => array(
      'entityId' => 'urn:swarm-example:sp',
      'assertionConsumerService' => array(
        'url' => 'https://swarm.example.com/',
      ),
    ),
    'idp' => array(
      'entityId' => 'urn:auth-service:idp',
      'singleSignOnService' => array(
        'url' => 'https://has.example.com/saml/login',
      ),
      'x509cert' => '-----BEGIN CERTIFICATE-----
MIIEoTCCAokCAQEwDQYJKoZIhvcNAQELBQAwGDEWMBQGA1UEAwwNRmFrZUF1dGhv
cml0eTAeFw0yMTExMDgyMjE1MzRaFw0zMTExMDYyMjE1MzRaMBUxEzARBgNVBAMM
CmF1dGhlbi5kb2MwggIiMA0GCSqGSIb3DQEBAQUAA4ICDwAwggIKAoICAQDC0Whu
jXOzgiKRBFtu38BgQ+hujR0UGUS2DvbrTzHCODyFGudvjTXLKp+Ms/4okfuvWdcz
PK5h0vy1lO/INlNDchRytIhrws9mIY9wuLJW3tgocDF2WARiON6ZABMx/JC2Qcs/
/K8gu0KIbxa8r7jfCs9YChOuqG7CD3JuXZVv9TKgoPgXTYCu/LbNxpm92hBRyffJ
K+DSdvdRnvnMrvR5LbED4Pk+k0DMXOtypgoC9KIvciIVS8TGPdpcyXxUg1ba7nik
TgwaOvywYKJHyY46gFcRSq8CDlcRPAGzDubneT1r2K0LmshWTB8fg+2XgcbTLSGy
it+Q6zRogU7ts/8dNk7wN1iGbP7jqrGYCUBZpnu97pNFFaHEB/2KZfNdIRF6ARJO
4bwXnXeNEIxWV6mARvFvSVfeISu09NfZCQuY1WGiO7dgfOb3OLpnEun6VpkwRJ9m
rZ6a4l2yHYCJTUlQchYbAzz40Ye2U1eW9UB0OMyXAbhPIIblNf8Uic8mDo98mG63
jdl+xrC9J1EbUej9v9NaqSfP09Pi6fgt3f6itCdoFaUgDJNrcCgKE09X4uvjL+sV
ISdBXE+C0ODMACCnpjnJ5QFHu+KoDsqdbArnm/cLU6Ck0wyOI72DqAuWR/SYXgkO
P0AA8LDbKQo00/rbEr5SRv+ya4MlaW4vkB7qGwIDAQABMA0GCSqGSIb3DQEBCwUA
A4ICAQBvjCCs8Xsi0U7KSrXq9q7Ysht7Jf+3a5JaA2gHU40CYIqRlReX3bcHAra5
2eZu77pazxDDtlWQtdv2C0P4l5hl+IhaUipDNQEciYcVBsJp2Lizedla0IEgfyEv
cJrvaULHRaNVhOkM2MJNE1xsP0yF34aXR85nmJ7K8qqHaxDokAyMqbVOwQW3nTaM
cvpesfaRwE8+eIjohMFEyuc+qpV1titjXueQ9GulkSX20tsiOmnl3KtY3VGCTrXs
mbbL46utMifkhYG6B3aQbcl16SeQth0Bihc9xfJHzrigwb4l+cfJe3eUPPclvTOs
2eWKcuMxAipmCir52Lr1WIFzIkAn2UqP4aZo8+MM2bsOGI09dNUmflg/ZyI+F5tl
kD5+gkn5fXwfQuVScYH7ecOIZhCvtsE0+FgqdMx5rkBKdxpGQqd8JpR6ENfJc2y6
okBJ30ZSXKIpBXz8dDlSwDwA5dpICW8YR6aTQuWgriadXS6Abni2gsx1sAPpt7bg
svjqwGB+wnqvD7+oCjH3/kLKTgm6Rh8NMViS/O7kyIa+8B7lw2EhTb6yySxVZgs5
gTw6pzhEX/3xGwgDOn4UK4gzk2xAkAUsh0IQNnfcj13P6VqslVLcI/2mqKT72Quo
MZXNWXiBpf4CRHvtHBOD7Jae4d7mlqAZp9JUHbVxTv4lHT3fcw==
-----END CERTIFICATE-----',
    ),
  ),
);`
    const result = await usecase('https://has.example.com', swarmConfig)
    // assert
    assert.equal(result.status, 'ok')
    assert.lengthOf(result.results, 0)
  })

  it('should match an ACS URL against a regex', async function () {
    // arrange
    settingsRepository.set('CERT_FILE', 'certs/server.crt')
    const idpConfig = {
      'urn:swarm-example:sp': {
        acsUrlRe: 'https://swarm\\.example\\.com/api/v10/session'
      }
    }
    const usecase = ValidateSwarmConfig({ settingsRepository, getIdPConfiguration: () => idpConfig })
    // act
    const swarmConfig = `<?php
return array(
  'saml' => array(
    'sp' => array(
      'entityId' => 'urn:swarm-example:sp',
      'assertionConsumerService' => array(
        'url' => 'https://swarm.example.com/',
      ),
    ),
    'idp' => array(
      'entityId' => 'urn:auth-service:idp',
      'singleSignOnService' => array(
        'url' => 'https://has.example.com/saml/login',
      ),
      'x509cert' => '-----BEGIN CERTIFICATE-----
MIIEoTCCAokCAQEwDQYJKoZIhvcNAQELBQAwGDEWMBQGA1UEAwwNRmFrZUF1dGhv
cml0eTAeFw0yMTExMDgyMjE1MzRaFw0zMTExMDYyMjE1MzRaMBUxEzARBgNVBAMM
CmF1dGhlbi5kb2MwggIiMA0GCSqGSIb3DQEBAQUAA4ICDwAwggIKAoICAQDC0Whu
jXOzgiKRBFtu38BgQ+hujR0UGUS2DvbrTzHCODyFGudvjTXLKp+Ms/4okfuvWdcz
PK5h0vy1lO/INlNDchRytIhrws9mIY9wuLJW3tgocDF2WARiON6ZABMx/JC2Qcs/
/K8gu0KIbxa8r7jfCs9YChOuqG7CD3JuXZVv9TKgoPgXTYCu/LbNxpm92hBRyffJ
K+DSdvdRnvnMrvR5LbED4Pk+k0DMXOtypgoC9KIvciIVS8TGPdpcyXxUg1ba7nik
TgwaOvywYKJHyY46gFcRSq8CDlcRPAGzDubneT1r2K0LmshWTB8fg+2XgcbTLSGy
it+Q6zRogU7ts/8dNk7wN1iGbP7jqrGYCUBZpnu97pNFFaHEB/2KZfNdIRF6ARJO
4bwXnXeNEIxWV6mARvFvSVfeISu09NfZCQuY1WGiO7dgfOb3OLpnEun6VpkwRJ9m
rZ6a4l2yHYCJTUlQchYbAzz40Ye2U1eW9UB0OMyXAbhPIIblNf8Uic8mDo98mG63
jdl+xrC9J1EbUej9v9NaqSfP09Pi6fgt3f6itCdoFaUgDJNrcCgKE09X4uvjL+sV
ISdBXE+C0ODMACCnpjnJ5QFHu+KoDsqdbArnm/cLU6Ck0wyOI72DqAuWR/SYXgkO
P0AA8LDbKQo00/rbEr5SRv+ya4MlaW4vkB7qGwIDAQABMA0GCSqGSIb3DQEBCwUA
A4ICAQBvjCCs8Xsi0U7KSrXq9q7Ysht7Jf+3a5JaA2gHU40CYIqRlReX3bcHAra5
2eZu77pazxDDtlWQtdv2C0P4l5hl+IhaUipDNQEciYcVBsJp2Lizedla0IEgfyEv
cJrvaULHRaNVhOkM2MJNE1xsP0yF34aXR85nmJ7K8qqHaxDokAyMqbVOwQW3nTaM
cvpesfaRwE8+eIjohMFEyuc+qpV1titjXueQ9GulkSX20tsiOmnl3KtY3VGCTrXs
mbbL46utMifkhYG6B3aQbcl16SeQth0Bihc9xfJHzrigwb4l+cfJe3eUPPclvTOs
2eWKcuMxAipmCir52Lr1WIFzIkAn2UqP4aZo8+MM2bsOGI09dNUmflg/ZyI+F5tl
kD5+gkn5fXwfQuVScYH7ecOIZhCvtsE0+FgqdMx5rkBKdxpGQqd8JpR6ENfJc2y6
okBJ30ZSXKIpBXz8dDlSwDwA5dpICW8YR6aTQuWgriadXS6Abni2gsx1sAPpt7bg
svjqwGB+wnqvD7+oCjH3/kLKTgm6Rh8NMViS/O7kyIa+8B7lw2EhTb6yySxVZgs5
gTw6pzhEX/3xGwgDOn4UK4gzk2xAkAUsh0IQNnfcj13P6VqslVLcI/2mqKT72Quo
MZXNWXiBpf4CRHvtHBOD7Jae4d7mlqAZp9JUHbVxTv4lHT3fcw==
-----END CERTIFICATE-----',
    ),
  ),
);`
    const result = await usecase('https://has.example.com', swarmConfig)
    // assert
    assert.equal(result.status, 'ok')
    assert.lengthOf(result.results, 0)
  })
})
