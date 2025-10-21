//
// Copyright 2023 Perforce Software
//
import { assert } from 'chai'
import { describe, it, run } from 'mocha'
import request from 'supertest'
// Load the test environment before the bulk of our code initializes, otherwise
// it will be too late due to the `import` early-binding behavior.
import 'helix-auth-svc/test/env.js'
import createApp from 'helix-auth-svc/lib/app.js'
import { createServer } from 'helix-auth-svc/lib/server.js'
import container from 'helix-auth-svc/lib/container.js'

// Tests must be run with `mocha --delay --exit` otherwise we do not give the
// server enough time to start up, and the server hangs indefinitely because
// mocha no longer exits after the tests complete.

const settings = container.resolve('settingsRepository')
const app = await createApp()
const server = createServer(app, settings)
const agent = request.agent(server)
//
// Would have used the ca function but that made no difference,
// still rejected with "Error: self signed certificate" in Node.
//
// const ca = fs.readFileSync('certs/ca.crt')
// const agent = request.agent(server).ca(ca)
// const agent = request.agent(server, { ca })

//
// Give the server a chance to start up asynchronously. This works in concert
// with the --delay flag to the mocha command. A timeout of zero is not quite
// sufficient, so this timing is somewhat fragile.
//
setTimeout(function () {
  describe('Swarm requests', function () {
    it('should report parsing errors', function (done) {
      const swarmConfig = `<?php
return array(
  'saml' => array(
    'sp' => array(
      'entityId' => 'urn:swarm-example:sp',
      'assertionConsumerService' => array(
        'url' => 'https://swarm.beehive.com/',
      ),
);`
      agent
        .post('/validate/swarm')
        .trustLocalhost(true)
        .field('config', swarmConfig)
        .expect(200)
        .expect(res => {
          assert.equal(res.body.status, 'errors')
          assert.lengthOf(res.body.errors, 1)
          assert.isTrue(res.body.errors.some((e) => e === 'expected array close, got Token[semi, ;]'))
        })
        .end(done)
    })

    it('should process config as text part', function (done) {
      const swarmConfig = `<?php
return array(
  'saml' => array(
    'sp' => array(
      'entityId' => 'urn:swarm-example:sp',
      'assertionConsumerService' => array(
        'url' => 'https://swarm.beehive.com/',
      ),
    ),
    'idp' => array(
      'entityId' => 'urn:auth-service:idp',
      'singleSignOnService' => array(
        'url' => 'present',
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
      agent
        .post('/validate/swarm')
        .trustLocalhost(true)
        .field('config', swarmConfig)
        .expect(200)
        .expect(res => {
          assert.equal(res.body.status, 'results')
          assert.lengthOf(res.body.results, 2)
          assert.isTrue(res.body.results.some((e) => e.includes('saml.sp.assertionConsumerService.url must be')))
          assert.isTrue(res.body.results.some((e) => e.includes('saml.idp.singleSignOnService.url must be')))
        })
        .end(done)
    })

    it('should process config as text part', function (done) {
      agent
        .post('/validate/swarm')
        .trustLocalhost(true)
        .attach('config', 'test/fixtures/swarm-config.php')
        .expect(200)
        .expect(res => {
          assert.equal(res.body.status, 'results')
          assert.lengthOf(res.body.results, 2)
          assert.isTrue(res.body.results.some((e) => e.includes('saml.sp.assertionConsumerService.url must be')))
          assert.isTrue(res.body.results.some((e) => e.includes('saml.idp.singleSignOnService.url must be')))
        })
        .end(done)
    })

    it('should report success when no issues', function (done) {
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
        'url' => 'https://localhost:3333/saml/login',
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
      agent
        .post('/validate/swarm')
        .trustLocalhost(true)
        .field('config', swarmConfig)
        .expect(200)
        .expect(res => {
          assert.equal(res.body.status, 'ok')
          assert.lengthOf(res.body.errors, 0)
          assert.lengthOf(res.body.results, 0)
        })
        .end(done)
    })
  })

  run()
}, 500)
