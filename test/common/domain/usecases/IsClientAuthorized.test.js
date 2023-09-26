//
// Copyright 2023 Perforce Software
//
import { AssertionError } from 'node:assert'
import * as fs from 'node:fs'
import * as http from 'node:http'
import * as https from 'node:https'
import { assert } from 'chai'
import { before, beforeEach, describe, it } from 'mocha'
import express from 'express'
import request from 'supertest'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'
import IsClientAuthorized from 'helix-auth-svc/lib/common/domain/usecases/IsClientAuthorized.js'
import LoadAuthorityCerts from 'helix-auth-svc/lib/common/domain/usecases/LoadAuthorityCerts.js'

describe('IsClientAuthorized use case', function () {
  const settingsRepository = new MapSettingsRepository()
  let usecase
  let loadAuthorityCerts

  before(function () {
    usecase = IsClientAuthorized({ settingsRepository })
    loadAuthorityCerts = LoadAuthorityCerts({ settingsRepository })
  })

  beforeEach(function () {
    settingsRepository.clear()
  })

  it('should raise an error for invalid input', function () {
    assert.throws(() => IsClientAuthorized({ settingsRepository: null }), AssertionError)
    try {
      usecase(null)
      assert.fail('should have raised error')
    } catch (err) {
      assert.instanceOf(err, AssertionError)
    }
  })

  it('should return true for plain http connection', function (done) {
    const agent = createAgent(usecase, 'http', settingsRepository, loadAuthorityCerts)
    agent
      .get('/')
      .trustLocalhost(true)
      .expect(200, 'success', done)
  })

  it('should raise an error for https w/o client certificate', function (done) {
    settingsRepository.set('PROTOCOL', 'https')
    settingsRepository.set('serviceCert', 'certs/server.crt')
    settingsRepository.set('serviceKey', 'certs/server.key')
    const agent = createAgent(usecase, 'https', settingsRepository, loadAuthorityCerts)
    agent
      .get('/')
      .trustLocalhost(true)
      .expect(401, 'client certificate required', done)
  })

  it('should return true for https and assume=true', function (done) {
    settingsRepository.set('PROTOCOL', 'https')
    settingsRepository.set('serviceCert', 'certs/server.crt')
    settingsRepository.set('serviceKey', 'certs/server.key')
    settingsRepository.set('ASSUME_CLIENT_AUTHORIZED', 'true')
    const agent = createAgent(usecase, 'https', settingsRepository, loadAuthorityCerts)
    agent
      .get('/')
      .trustLocalhost(true)
      .expect(200, 'success', done)
  })

  it('should raise an error for https without cert authority', function (done) {
    settingsRepository.set('PROTOCOL', 'https')
    settingsRepository.set('serviceCert', 'certs/server.crt')
    settingsRepository.set('serviceKey', 'certs/server.key')
    const agent = createAgent(usecase, 'https', settingsRepository, loadAuthorityCerts)
    const cert = fs.readFileSync('test/client.crt')
    const key = fs.readFileSync('test/client.key')
    agent
      .get('/')
      .trustLocalhost(true)
      .key(key)
      .cert(cert)
      .expect(403, /is not authorized/, done)
  })

  it('should raise an error for https and unauthorized client cert', function (done) {
    settingsRepository.set('PROTOCOL', 'https')
    settingsRepository.set('serviceCert', 'certs/server.crt')
    settingsRepository.set('serviceKey', 'certs/server.key')
    settingsRepository.set('CA_CERT_FILE', 'test/ca.crt')
    const agent = createAgent(usecase, 'https', settingsRepository, loadAuthorityCerts)
    const cert = fs.readFileSync('test/client.crt')
    const key = fs.readFileSync('test/client.key')
    agent
      .get('/')
      .trustLocalhost(true)
      .key(key)
      .cert(cert)
      .expect(403, /is not authorized/, done)
  })

  it('should raise an error for https and mismatched client cert', function (done) {
    settingsRepository.set('PROTOCOL', 'https')
    settingsRepository.set('serviceCert', 'certs/server.crt')
    settingsRepository.set('serviceKey', 'certs/server.key')
    settingsRepository.set('CA_CERT_FILE', 'certs/ca.crt')
    settingsRepository.set('CLIENT_CERT_FP', 'AA:BB:CC:DD:EE:FF')
    const agent = createAgent(usecase, 'https', settingsRepository, loadAuthorityCerts)
    const cert = fs.readFileSync('test/client.crt')
    const key = fs.readFileSync('test/client.key')
    agent
      .get('/')
      .trustLocalhost(true)
      .key(key)
      .cert(cert)
      .expect(403, /does not match fingerprint/, done)
  })

  it('should return true for https and matching fingerprint', function (done) {
    settingsRepository.set('PROTOCOL', 'https')
    settingsRepository.set('serviceCert', 'certs/server.crt')
    settingsRepository.set('serviceKey', 'certs/server.key')
    settingsRepository.set('CA_CERT_FILE', 'certs/ca.crt')
    settingsRepository.set('CLIENT_CERT_FP', '39:65:C1:9A:2F:9A:66:B6:57:54:F5:05:8D:F4:2F:3B:53:BB:7D:3E:C6:C0:36:D4:10:4D:F8:A4:0C:8B:56:9E')
    const agent = createAgent(usecase, 'https', settingsRepository, loadAuthorityCerts)
    const cert = fs.readFileSync('test/client.crt')
    const key = fs.readFileSync('test/client.key')
    agent
      .get('/')
      .trustLocalhost(true)
      .key(key)
      .cert(cert)
      .expect(200, 'success', done)
  })

  it('should return true with one of multiple fingerprints', function (done) {
    settingsRepository.set('PROTOCOL', 'https')
    settingsRepository.set('serviceCert', 'certs/server.crt')
    settingsRepository.set('serviceKey', 'certs/server.key')
    settingsRepository.set('CA_CERT_FILE', 'certs/ca.crt')
    settingsRepository.set('CLIENT_CERT_FP', '[xxx,yyy,39:65:C1:9A:2F:9A:66:B6:57:54:F5:05:8D:F4:2F:3B:53:BB:7D:3E:C6:C0:36:D4:10:4D:F8:A4:0C:8B:56:9E,zzz]')
    const agent = createAgent(usecase, 'https', settingsRepository, loadAuthorityCerts)
    const cert = fs.readFileSync('test/client.crt')
    const key = fs.readFileSync('test/client.key')
    agent
      .get('/')
      .trustLocalhost(true)
      .key(key)
      .cert(cert)
      .expect(200, 'success', done)
  })

  it('should return true for https and authorized client cert', function (done) {
    settingsRepository.set('PROTOCOL', 'https')
    settingsRepository.set('serviceCert', 'certs/server.crt')
    settingsRepository.set('serviceKey', 'certs/server.key')
    settingsRepository.set('CA_CERT_FILE', 'certs/ca.crt')
    const agent = createAgent(usecase, 'https', settingsRepository, loadAuthorityCerts)
    const cert = fs.readFileSync('test/client.crt')
    const key = fs.readFileSync('test/client.key')
    agent
      .get('/')
      .trustLocalhost(true)
      .key(key)
      .cert(cert)
      .expect(200, 'success', done)
  })

  it('should raise an error for https and mismatched common name', function (done) {
    settingsRepository.set('PROTOCOL', 'https')
    settingsRepository.set('serviceCert', 'certs/server.crt')
    settingsRepository.set('serviceKey', 'certs/server.key')
    settingsRepository.set('CA_CERT_FILE', 'certs/ca.crt')
    settingsRepository.set('CLIENT_CERT_CN', 'NotMatchingCommonName')
    const agent = createAgent(usecase, 'https', settingsRepository, loadAuthorityCerts)
    const cert = fs.readFileSync('test/client.crt')
    const key = fs.readFileSync('test/client.key')
    agent
      .get('/')
      .trustLocalhost(true)
      .key(key)
      .cert(cert)
      .expect(403, /is not permitted/, done)
  })

  it('should return true for https and matching common name', function (done) {
    settingsRepository.set('PROTOCOL', 'https')
    settingsRepository.set('serviceCert', 'certs/server.crt')
    settingsRepository.set('serviceKey', 'certs/server.key')
    settingsRepository.set('CA_CERT_FILE', 'certs/ca.crt')
    settingsRepository.set('CLIENT_CERT_CN', 'LoginExtension')
    const agent = createAgent(usecase, 'https', settingsRepository, loadAuthorityCerts)
    const cert = fs.readFileSync('test/client.crt')
    const key = fs.readFileSync('test/client.key')
    agent
      .get('/')
      .trustLocalhost(true)
      .key(key)
      .cert(cert)
      .expect(200, 'success', done)
  })

  it('should return true with one of multiple common names', function (done) {
    settingsRepository.set('PROTOCOL', 'https')
    settingsRepository.set('serviceCert', 'certs/server.crt')
    settingsRepository.set('serviceKey', 'certs/server.key')
    settingsRepository.set('CA_CERT_FILE', 'certs/ca.crt')
    settingsRepository.set('CLIENT_CERT_CN', '[xxx,LoginExtension,yyy]')
    const agent = createAgent(usecase, 'https', settingsRepository, loadAuthorityCerts)
    const cert = fs.readFileSync('test/client.crt')
    const key = fs.readFileSync('test/client.key')
    agent
      .get('/')
      .trustLocalhost(true)
      .key(key)
      .cert(cert)
      .expect(200, 'success', done)
  })

  it('should return 401 if cert header value empty', function (done) {
    settingsRepository.set('PROTOCOL', 'https')
    settingsRepository.set('serviceCert', 'certs/server.crt')
    settingsRepository.set('serviceKey', 'certs/server.key')
    settingsRepository.set('CLIENT_CERT_HEADER', 'NoSuchHeader')
    const agent = createAgent(usecase, 'https', settingsRepository, loadAuthorityCerts)
    agent
      .get('/')
      .trustLocalhost(true)
      .expect(401, 'client certificate required', done)
  })

  it('should return 400 if cert header value malformed', function (done) {
    settingsRepository.set('PROTOCOL', 'https')
    settingsRepository.set('serviceCert', 'certs/server.crt')
    settingsRepository.set('serviceKey', 'certs/server.key')
    settingsRepository.set('CLIENT_CERT_HEADER', 'X-ARR-ClientCert')
    const agent = createAgent(usecase, 'https', settingsRepository, loadAuthorityCerts)
    agent
      .get('/')
      .trustLocalhost(true)
      .set('X-ARR-ClientCert', 'not-a-valid-base64-encoded-value')
      .expect(400, 'Invalid PEM formatted message.', done)
  })

  it('should return 200 if neither CN nor FP configured', function (done) {
    // technically this would be a misconfiguration but for consistency with the
    // non-header validation, treat as success
    settingsRepository.set('PROTOCOL', 'https')
    settingsRepository.set('serviceCert', 'certs/server.crt')
    settingsRepository.set('serviceKey', 'certs/server.key')
    settingsRepository.set('CLIENT_CERT_HEADER', 'ssl-client-cert')
    const agent = createAgent(usecase, 'https', settingsRepository, loadAuthorityCerts)
    const cert = fs.readFileSync('test/client.crt').toString()
    agent
      .get('/')
      .trustLocalhost(true)
      .set('ssl-client-cert', encodeURIComponent(cert))
      .expect(200, 'success', done)
  })

  it('should return 403 if cert CN does not match', function (done) {
    settingsRepository.set('PROTOCOL', 'https')
    settingsRepository.set('serviceCert', 'certs/server.crt')
    settingsRepository.set('serviceKey', 'certs/server.key')
    settingsRepository.set('CLIENT_CERT_HEADER', 'ssl-client-cert')
    settingsRepository.set('CLIENT_CERT_CN', 'WrongCommonName')
    const agent = createAgent(usecase, 'https', settingsRepository, loadAuthorityCerts)
    const cert = fs.readFileSync('test/client.crt').toString()
    agent
      .get('/')
      .trustLocalhost(true)
      .set('ssl-client-cert', encodeURIComponent(cert))
      .expect(403, 'client certificate LoginExtension is not permitted', done)
  })

  it('should return 403 if cert FP does not match', function (done) {
    settingsRepository.set('PROTOCOL', 'https')
    settingsRepository.set('serviceCert', 'certs/server.crt')
    settingsRepository.set('serviceKey', 'certs/server.key')
    settingsRepository.set('CLIENT_CERT_HEADER', 'ssl-client-cert')
    settingsRepository.set('CLIENT_CERT_FP', '63:2F:17:F3:2F:31:40:68:58:D6:38:54:92:7C:F8:95:26:E4:34:95:D4:1D:82:97:3C:2E:68:39:5E:A1:AC:11')
    const agent = createAgent(usecase, 'https', settingsRepository, loadAuthorityCerts)
    const cert = fs.readFileSync('test/client.crt').toString()
    agent
      .get('/')
      .trustLocalhost(true)
      .set('ssl-client-cert', encodeURIComponent(cert))
      .expect(403, 'client certificate does not match fingerprint', done)
  })

  it('should return 200 if cert CN matches', function (done) {
    settingsRepository.set('PROTOCOL', 'https')
    settingsRepository.set('serviceCert', 'certs/server.crt')
    settingsRepository.set('serviceKey', 'certs/server.key')
    settingsRepository.set('CLIENT_CERT_HEADER', 'ssl-client-cert')
    settingsRepository.set('CLIENT_CERT_CN', 'LoginExtension')
    const agent = createAgent(usecase, 'https', settingsRepository, loadAuthorityCerts)
    const cert = fs.readFileSync('test/client.crt').toString()
    agent
      .get('/')
      .trustLocalhost(true)
      .set('ssl-client-cert', encodeURIComponent(cert))
      .expect(200, 'success', done)
  })

  it('should return 200 if cert FP matches', function (done) {
    settingsRepository.set('PROTOCOL', 'https')
    settingsRepository.set('serviceCert', 'certs/server.crt')
    settingsRepository.set('serviceKey', 'certs/server.key')
    settingsRepository.set('CLIENT_CERT_HEADER', 'ssl-client-cert')
    settingsRepository.set('CLIENT_CERT_FP', '39:65:C1:9A:2F:9A:66:B6:57:54:F5:05:8D:F4:2F:3B:53:BB:7D:3E:C6:C0:36:D4:10:4D:F8:A4:0C:8B:56:9E')
    const agent = createAgent(usecase, 'https', settingsRepository, loadAuthorityCerts)
    const cert = fs.readFileSync('test/client.crt').toString()
    agent
      .get('/')
      .trustLocalhost(true)
      .set('ssl-client-cert', encodeURIComponent(cert))
      .expect(200, 'success', done)
  })

  it('should return 200 for matching cert (k8s example)', function (done) {
    settingsRepository.set('PROTOCOL', 'https')
    settingsRepository.set('serviceCert', 'certs/server.crt')
    settingsRepository.set('serviceKey', 'certs/server.key')
    settingsRepository.set('CLIENT_CERT_HEADER', 'ssl-client-cert')
    settingsRepository.set('CLIENT_CERT_FP', '39:65:C1:9A:2F:9A:66:B6:57:54:F5:05:8D:F4:2F:3B:53:BB:7D:3E:C6:C0:36:D4:10:4D:F8:A4:0C:8B:56:9E')
    const agent = createAgent(usecase, 'https', settingsRepository, loadAuthorityCerts)
    // real world example of encoded cert provided by nginx ingress controller in k8s
    const cert = '-----BEGIN%20CERTIFICATE-----%0AMIIEpTCCAo0CAQEwDQYJKoZIhvcNAQELBQAwGDEWMBQGA1UEAwwNRmFrZUF1dGhv%0Acml0eTAeFw0yMTExMDgyMjE1MjJaFw0zMTExMDYyMjE1MjJaMBkxFzAVBgNVBAMM%0ADkxvZ2luRXh0ZW5zaW9uMIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEA%0A6GSolzFoudYLxxPZQmaCiE%2BdcgRhK%2F8eESP7knkwnzjF2zEns1enQJOTPkcAFeCF%0Aw3hqKCViXjW%2BK0GTtGr%2FTy1W7VNTbD%2B4cVPRsh6g9BJCXRFNqXlkjM%2FVz1Nxw1pr%0AgHLU7q0BBDk59HMyaWmvJCOOUeVuCoDF%2B6CpgviiAIitl%2FPlvPjnHFfo8ebAWENx%0As8o2guJQjOcBF0Qo%2Bjql4I6apQzHFiq6DXxe2YJhkBjKDfpS81991Rm5UuQF%2B4EN%0AOGPepRdfxxlSw7wzJYwiabxMxCabOc6nKSTsSANKMBVdEZzHuDJLZAckPbeZgxTR%0Abcf52Wx%2FykutbSDL00vQxGTyYJoyS1D9mRO9vOrCJ9jrOwDMqSDMn%2FLYM7%2FLrVbB%0A%2BGdjWjA%2Be4dNiMH87JX6FAJjJ5uwI%2BpoceM9TFzdIxk0nEcLB6c88VAwvGQBhDjV%0ASD2RFlvu%2FocSZlok%2B3jeP1I1EnD%2F%2FH%2FC4xdo0u%2Bv8fkGaMqXKf1t3zDIyFPcefDe%0AgAyxVEp31PRB0U9kAYyEJpNfsoq17oMrUY78G0eCwePFHjdoSsJWesWN9iANF2CV%0AKYYsEljaksoUgZWrfffOeGVlkvZfAw%2BCTd7upBCDMZ2U9Ls3XbDvP2ATixjslgc%2F%0AdrHvRRZipNpWStjBJilQyKXZ1%2Bal63X4Ein0%2BXFa39kCAwEAATANBgkqhkiG9w0B%0AAQsFAAOCAgEAflgeOxTn56u%2FmiMJRfDDpCKTp6r3P09V0VGcvRgDYDpSe7xJ%2BQJ7%0Aa48ElDkEcCzE9z1yxPfBemHVfIgETDEc2tQ3%2FkFbV66IJ3Jcst6x0ppzxLPRwwjN%0AuC05Ms1ju7WH68BZlsQnz3fAieQfJScFeqJu0Ud3GIgobwZWHQ04Bd2o%2FJ6Twds%2F%0AAtRgN8eJfEvqH9yID%2FT%2BLCHYvKdr8YxthmFxIfZxIj3zycO8XM0f2A1S9rtiXYAz%0AQvXpH1Il8kTjcRl99fTTMw5M7CHoaDDrJS5zTym%2FmQiLbfLDAuPwEurYo049a7RR%0A5YtZCXS%2BwZe1bSqjAf3WLS79fUIbIiY4XM0cmF9q%2F%2BG5t%2BR%2FvXL9sI2z5kU0Iuvg%0ApO0TT8tFV32pNGffV7eyYjfO2VVU%2FkjXg5pORTewQydumGHXlufsziHDVw88jU0J%0Amt%2BTg1O%2FiAKc0iIukLB1sd9Tee0uHyYrEMlfc1V9187aRjCSouiJ8ngF%2FckK1pS7%0AHTNd5Oyc4Mamu0VDLLKizOJ%2F5%2FwVrDFmNCESVmVeZlrPw4mDtyHS4yBg%2BkXNiZNJ%0AKb%2BKL22md6GhcdUZ7owGxh2vi%2FDax%2FIuHFLgUM4%2FgNXQX1X%2B4z6%2FxzL%2BzWuozw8S%0A9MLAMUmZk66KdMZUbVli%2F%2FjTSrIOvXz%2FTfoZULC1G%2FucGzV0Y20rRic%3D%0A-----END%20CERTIFICATE-----%0A'
    agent
      .get('/')
      .trustLocalhost(true)
      .set('ssl-client-cert', cert)
      .expect(200, 'success', done)
  })

  it('should return 200 if FP matches for single-line cert', function (done) {
    settingsRepository.set('PROTOCOL', 'https')
    settingsRepository.set('serviceCert', 'certs/server.crt')
    settingsRepository.set('serviceKey', 'certs/server.key')
    settingsRepository.set('CLIENT_CERT_HEADER', 'X-ARR-ClientCert')
    settingsRepository.set('CLIENT_CERT_FP', '39:65:C1:9A:2F:9A:66:B6:57:54:F5:05:8D:F4:2F:3B:53:BB:7D:3E:C6:C0:36:D4:10:4D:F8:A4:0C:8B:56:9E')
    const agent = createAgent(usecase, 'https', settingsRepository, loadAuthorityCerts)
    // strip begin/end armor, merge into one line, do not URI encode
    const certBytes = fs.readFileSync('test/client.crt')
    const cert = massageCertificate(certBytes.toString())
    agent
      .get('/')
      .trustLocalhost(true)
      .set('X-ARR-ClientCert', cert)
      .expect(200, 'success', done)
  })
})

// Construct a simplified Express.js web application for testing the usecase.
function createAgent(usecase, protocol, settings, loadAuthorityCerts) {
  const app = express()
  const router = express.Router()
  // eslint-disable-next-line no-unused-vars
  router.get('/', (req, res, next) => {
    try {
      if (usecase(req)) {
        res.send('success')
      } else {
        res.status(500).send('usecase should never return false')
      }
    } catch (err) {
      if (err.code) {
        res.status(err.code).send(err.message)
      } else {
        res.status(500).send(err.message)
      }
    }
  })
  app.use('/', router)
  const server = createServer(app, protocol, settings, loadAuthorityCerts)
  return request.agent(server)
}

// Simplified version of the same function in server.js
function createServer(app, protocol, settings, loadAuthorityCerts) {
  if (protocol === 'http') {
    return http.createServer(app)
  } else {
    const options = {
      rejectUnauthorized: false,
      requestCert: true,
      key: fs.readFileSync(settings.get('serviceKey')),
      cert: fs.readFileSync(settings.get('serviceCert')),
      ca: loadAuthorityCerts()
    }
    return https.createServer(options, app)
  }
}

// Format the certificate text into a single line without begin/end lines.
function massageCertificate(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l =>
    l !== '-----BEGIN CERTIFICATE-----' && l !== '-----END CERTIFICATE-----' && l.length > 0
  )
  return lines.join('')
}
