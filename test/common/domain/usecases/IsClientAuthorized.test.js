//
// Copyright 2022 Perforce Software
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
  const settings = new Map()
  let usecase
  let loadAuthorityCerts

  before(function () {
    const settingsRepository = new MapSettingsRepository(settings)
    usecase = IsClientAuthorized({ settingsRepository })
    loadAuthorityCerts = LoadAuthorityCerts({ settingsRepository })
  })

  beforeEach(function () {
    settings.clear()
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
    const agent = createAgent(usecase, 'http', settings, loadAuthorityCerts)
    agent
      .get('/')
      .trustLocalhost(true)
      .expect(200)
      .expect(res => {
        assert.equal(res.text, 'success')
      })
      // eslint-disable-next-line no-unused-vars
      .end(function (err, res) {
        if (err) {
          return done(err)
        }
        done()
      })
  })

  it('should raise an error for https w/o client certificate', function (done) {
    settings.set('PROTOCOL', 'https')
    settings.set('serviceCert', 'certs/server.crt')
    settings.set('serviceKey', 'certs/server.key')
    const agent = createAgent(usecase, 'https', settings, loadAuthorityCerts)
    agent
      .get('/')
      .trustLocalhost(true)
      .expect(401)
      .expect(res => {
        assert.equal(res.text, 'client certificate required')
      })
      // eslint-disable-next-line no-unused-vars
      .end(function (err, res) {
        if (err) {
          return done(err)
        }
        done()
      })
  })

  it('should return true for https and assume=true', function (done) {
    settings.set('PROTOCOL', 'https')
    settings.set('serviceCert', 'certs/server.crt')
    settings.set('serviceKey', 'certs/server.key')
    settings.set('ASSUME_CLIENT_AUTHORIZED', 'true')
    const agent = createAgent(usecase, 'https', settings, loadAuthorityCerts)
    agent
      .get('/')
      .trustLocalhost(true)
      .expect(200)
      .expect(res => {
        assert.equal(res.text, 'success')
      })
      // eslint-disable-next-line no-unused-vars
      .end(function (err, res) {
        if (err) {
          return done(err)
        }
        done()
      })
  })

  it('should raise an error for https without cert authority', function (done) {
    settings.set('PROTOCOL', 'https')
    settings.set('serviceCert', 'certs/server.crt')
    settings.set('serviceKey', 'certs/server.key')
    const agent = createAgent(usecase, 'https', settings, loadAuthorityCerts)
    const cert = fs.readFileSync('test/client.crt')
    const key = fs.readFileSync('test/client.key')
    agent
      .get('/')
      .trustLocalhost(true)
      .key(key)
      .cert(cert)
      .expect(403)
      .expect(res => {
        assert.include(res.text, 'is not authorized')
      })
      // eslint-disable-next-line no-unused-vars
      .end(function (err, res) {
        if (err) {
          return done(err)
        }
        done()
      })
  })

  it('should raise an error for https and unauthorized client cert', function (done) {
    settings.set('PROTOCOL', 'https')
    settings.set('serviceCert', 'certs/server.crt')
    settings.set('serviceKey', 'certs/server.key')
    settings.set('CA_CERT_FILE', 'test/ca.crt')
    const agent = createAgent(usecase, 'https', settings, loadAuthorityCerts)
    const cert = fs.readFileSync('test/client.crt')
    const key = fs.readFileSync('test/client.key')
    agent
      .get('/')
      .trustLocalhost(true)
      .key(key)
      .cert(cert)
      .expect(403)
      .expect(res => {
        assert.include(res.text, 'is not authorized')
      })
      // eslint-disable-next-line no-unused-vars
      .end(function (err, res) {
        if (err) {
          return done(err)
        }
        done()
      })
  })

  it('should return true for https and authorized client cert', function (done) {
    settings.set('PROTOCOL', 'https')
    settings.set('serviceCert', 'certs/server.crt')
    settings.set('serviceKey', 'certs/server.key')
    settings.set('CA_CERT_FILE', 'certs/ca.crt')
    const agent = createAgent(usecase, 'https', settings, loadAuthorityCerts)
    const cert = fs.readFileSync('test/client.crt')
    const key = fs.readFileSync('test/client.key')
    agent
      .get('/')
      .trustLocalhost(true)
      .key(key)
      .cert(cert)
      .expect(200)
      .expect(res => {
        assert.equal(res.text, 'success')
      })
      // eslint-disable-next-line no-unused-vars
      .end(function (err, res) {
        if (err) {
          return done(err)
        }
        done()
      })
  })

  it('should raise an error for https and mismatched common name', function (done) {
    settings.set('PROTOCOL', 'https')
    settings.set('serviceCert', 'certs/server.crt')
    settings.set('serviceKey', 'certs/server.key')
    settings.set('CA_CERT_FILE', 'certs/ca.crt')
    settings.set('CLIENT_CERT_CN', 'NotMatchingCommonName')
    const agent = createAgent(usecase, 'https', settings, loadAuthorityCerts)
    const cert = fs.readFileSync('test/client.crt')
    const key = fs.readFileSync('test/client.key')
    agent
      .get('/')
      .trustLocalhost(true)
      .key(key)
      .cert(cert)
      .expect(403)
      .expect(res => {
        assert.include(res.text, 'is not permitted')
      })
      // eslint-disable-next-line no-unused-vars
      .end(function (err, res) {
        if (err) {
          return done(err)
        }
        done()
      })
  })

  it('should return true for https and matching common name', function (done) {
    settings.set('PROTOCOL', 'https')
    settings.set('serviceCert', 'certs/server.crt')
    settings.set('serviceKey', 'certs/server.key')
    settings.set('CA_CERT_FILE', 'certs/ca.crt')
    settings.set('CLIENT_CERT_CN', 'LoginExtension')
    const agent = createAgent(usecase, 'https', settings, loadAuthorityCerts)
    const cert = fs.readFileSync('test/client.crt')
    const key = fs.readFileSync('test/client.key')
    agent
      .get('/')
      .trustLocalhost(true)
      .key(key)
      .cert(cert)
      .expect(200)
      .expect(res => {
        assert.equal(res.text, 'success')
      })
      // eslint-disable-next-line no-unused-vars
      .end(function (err, res) {
        if (err) {
          return done(err)
        }
        done()
      })
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
