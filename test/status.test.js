//
// Copyright 2022 Perforce Software
//
import { spawn } from 'node:child_process'
import { temporaryFile } from 'tempy'
import { assert } from 'chai'
import { after, before, describe, it } from 'mocha'
import mute from 'mute'
import sinon from 'sinon'
import loadAuthorityCerts from 'helix-auth-svc/lib/common/domain/usecases/LoadAuthorityCerts.js'
import { DummyRedisConnector } from 'helix-auth-svc/lib/features/login/data/connectors/DummyRedisConnector.js'
import { RedisConnector } from 'helix-auth-svc/lib/features/login/data/connectors/RedisConnector.js'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'
import { HelixEntityRepository } from 'helix-auth-svc/lib/features/scim/data/repositories/HelixEntityRepository.js'
import * as helpers from 'helix-auth-svc/test/helpers.js'
import * as runner from 'helix-auth-svc/test/runner.js'
import * as sut from 'helix-auth-svc/lib/status.js'

describe('Service status', function () {
  describe('summary status', function () {
    it('should report not ok if any not ok', async function () {
      const results = ['ok', 'ok', 'not ok', 'ok']
      assert.equal(sut.summarize(results), 'not ok')
    })

    it('should report not ok if any errors', async function () {
      const results = ['ok', 'ok', new Error('fubar'), 'ok']
      assert.equal(sut.summarize(results), 'not ok')
    })

    it('should report ok if some not configured', async function () {
      const results = ['ok', 'ok', 'not configured', 'ok']
      assert.equal(sut.summarize(results), 'ok')
    })

    it('should report ok if some are objects with all ok', async function () {
      const object = {
        'field1': 'ok',
        'field2': 'ok'
      }
      const results = ['ok', 'ok', object, 'ok']
      assert.equal(sut.summarize(results), 'ok')
    })

    it('should report not ok if some are objects with any !ok', async function () {
      const object = {
        'field1': 'ok',
        'field2': 'error'
      }
      const results = ['ok', 'ok', object, 'ok']
      assert.equal(sut.summarize(results), 'not ok')
    })
  })

  describe('validateCertAuth', function () {
    it('should report not configured', async function () {
      assert.equal(await sut.validateCertAuth(null), 'not configured')
    })

    it('should report missing file', async function () {
      const result = await sut.validateCertAuth('nosuchfile')
      assert.include(result.code, 'ENOENT')
    })

    it('should report invalid certificate', async function () {
      try {
        await sut.validateCertAuth('README.md')
      } catch (err) {
        assert.include(err, 'unable to load certificate')
      }
    })

    it('should report expired certificate', async function () {
      const result = await sut.validateCertAuth('test/fixtures/expired_ca.crt')
      assert.equal(result, 'not ok')
    })

    it('should report soon-to-expire certificate', async function () {
      // this test can take a randomly long time to run
      this.timeout(30000)
      const keyfile = temporaryFile({ extension: 'key' })
      const certfile = temporaryFile({ extension: 'crt' })
      await makeExpiringCert(keyfile, certfile)
      const result = await sut.validateCertAuth(certfile)
      assert.equal(result, 'not ok')
    })

    it('should report valid certificate', async function () {
      const result = await sut.validateCertAuth('certs/ca.crt')
      assert.equal(result, 'ok')
    })
  })

  describe('validateServerCert', function () {
    it('should report missing certificate', async function () {
      const result = await sut.validateServerCert('nosuchfile', 'certs/server.key')
      assert.include(result.code, 'ENOENT')
    })

    it('should report invalid certificate', async function () {
      try {
        await sut.validateServerCert('README.md', 'certs/server.key')
      } catch (err) {
        assert.include(err, 'unable to load certificate')
      }
    })

    it('should report expired certificate', async function () {
      const result = await sut.validateServerCert(
        'test/fixtures/expired_server.crt', 'test/fixtures/expired_server.key'
      )
      assert.equal(result, 'not ok')
    })

    it('should report soon-to-expire certificate', async function () {
      // this test can take a randomly long time to run
      this.timeout(30000)
      const keyfile = temporaryFile({ extension: 'key' })
      const certfile = temporaryFile({ extension: 'crt' })
      await makeExpiringCert(keyfile, certfile)
      const result = await sut.validateServerCert(certfile, keyfile)
      assert.equal(result, 'not ok')
    })

    it('should report missing key', async function () {
      const result = await sut.validateServerCert('certs/server.crt', 'nosuchfile')
      assert.include(result.code, 'ENOENT')
    })

    it('should report invalid key', async function () {
      try {
        await sut.validateServerCert('certs/server.crt', 'README.md')
      } catch (err) {
        assert.include(err, 'unable to load certificate')
      }
    })

    it('should report mismatch public/private parts', async function () {
        const result = await sut.validateServerCert('certs/server.crt', 'certs/ca.key')
        assert.equal(result, 'mismatch')
    })

    it('should report failure to read encrypted key', async function () {
      const result = await sut.validateServerCert(
        'certs/server.crt', 'certs/encrypted.key', 'foobar'
      )
      assert.include(result.toString(), 'unable to load Private Key')
    })

    it('should successfully validate encrypted key', async function () {
      const result = await sut.validateServerCert(
        'certs/server.crt', 'certs/encrypted.key', 'Passw0rd!'
      )
      assert.equal(result, 'ok')
    })

    it('should report valid certificate', async function () {
      const result = await sut.validateServerCert('certs/server.crt', 'certs/server.key')
      assert.equal(result, 'ok')
    })
  })

  describe('validatePfxFile', function () {
    it('should report missing file', async function () {
      const result = await sut.validatePfxFile('nosuchfile')
      assert.include(result.code, 'ENOENT')
    })

    it('should report invalid file', async function () {
      try {
        await sut.validatePfxFile('README.md')
      } catch (err) {
        assert.include(err.toString(), 'wrong tag')
      }
    })

    it('should report expired certificate', async function () {
      const result = await sut.validatePfxFile('test/fixtures/expired_server.p12')
      assert.equal(result, 'not ok')
    })

    it('should report soon-to-expire certificate', async function () {
      // this test can take a randomly long time to run
      this.timeout(30000)
      const keyfile = temporaryFile({ extension: 'key' })
      const certfile = temporaryFile({ extension: 'crt' })
      await makeExpiringCert(keyfile, certfile)
      const pfxfile = temporaryFile({ extension: 'p12' })
      await convertToPfx(keyfile, certfile, pfxfile)
      const result = await sut.validatePfxFile(pfxfile)
      assert.equal(result, 'not ok')
    })

    it('should report valid PKCS#12 file', async function () {
      const result = await sut.validatePfxFile('certs/server.p12', 'Passw0rd!')
      assert.equal(result, 'ok')
    })
  })

  describe('validateOpenID', function () {
    it('should indicate not configured when no issuerUri', async function () {
      const result = await sut.validateOpenID(null)
      assert.equal(result, 'not configured')
    })

    it('should return an error when not working', async function () {
      // assumes gopher (port 70) is not running on localhost
      const result = await sut.validateOpenID('https://localhost:70')
      assert.instanceOf(result, Error)
    })

    it('should return ok for working OIDC connection', async function () {
      if (process.env.UNIT_ONLY) {
        this.skip()
      } else {
        this.timeout(10000)
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0
        // mute the warning from node about disabling TLS validation
        const unmute = mute(process.stderr)
        const result = await sut.validateOpenID('https://oidc.doc:8843')
        assert.equal(result, 'ok')
        unmute()
        delete process.env.NODE_TLS_REJECT_UNAUTHORIZED
      }
    })
  })

  describe('validateSaml', function () {
    it('should indicate not configured when no metadataUrl', async function () {
      const result = await sut.validateSaml(null)
      assert.equal(result, 'not configured')
    })

    it('should return an error when not working', async function () {
      // assumes gopher (port 70) is not running on localhost
      const result = await sut.validateSaml('https://localhost:70')
      assert.instanceOf(result, Error)
    })

    it('should return ok for working SAML connection', async function () {
      if (process.env.UNIT_ONLY) {
        this.skip()
      } else {
        this.timeout(10000)
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0
        // mute the warning from node about disabling TLS validation
        const unmute = mute(process.stderr)
        const result = await sut.validateSaml('https://shibboleth.doc:4443/idp/shibboleth')
        assert.equal(result, 'ok')
        unmute()
        delete process.env.NODE_TLS_REJECT_UNAUTHORIZED
      }
    })
  })

  describe('validateRedis', function () {
    it('should report not configured', async function () {
      // weird case of having no repository at all
      assert.equal(await sut.validateRedis(null), 'not configured')
      // arrange
      const stub = sinon.stub(DummyRedisConnector.prototype, 'client').callsFake(() => {
        return {}
      })
      const connector = new DummyRedisConnector()
      // act
      const result = await sut.validateRedis(connector)
      // assert
      assert.equal(result, 'not configured')
      stub.restore()
    })

    it('should report not ok for broken connection', async function () {
      // arrange
      const stub = sinon.stub(DummyRedisConnector.prototype, 'client').callsFake(() => {
        return {
          ping () {
            throw new Error('not working')
          }
        }
      })
      const connector = new DummyRedisConnector()
      // act
      const result = await sut.validateRedis(connector)
      // assert
      assert.equal(result.message, 'not working')
      stub.restore()
    })

    it('should report ok for working non-TLS connection', async function () {
      if (process.env.UNIT_ONLY) {
        this.skip()
      } else {
        // this test can take a randomly long time to run
        this.timeout(30000)
        // arrange
        const map = new Map()
        map.set('REDIS_URL', 'redis://redis.doc:6379')
        const settingsRepository = new MapSettingsRepository(map)
        const connector = new RedisConnector({ settingsRepository })
        // act
        const result = await sut.validateRedis(connector)
        // assert
        assert.equal(result, 'ok')
      }
    })

    it('should report ok for working TLS connection', async function () {
      if (process.env.UNIT_ONLY) {
        this.skip()
      } else {
        // this test can take a randomly long time to run
        this.timeout(30000)
        // arrange
        const map = new Map()
        map.set('REDIS_URL', 'rediss://rediss.doc:6389')
        map.set('REDIS_CERT_FILE', './test/client.crt')
        map.set('REDIS_KEY_FILE', './test/client.key')
        map.set('CA_CERT_FILE', './certs/ca.crt')
        const settingsRepository = new MapSettingsRepository(map)
        const connector = new RedisConnector({
          settingsRepository,
          loadAuthorityCerts: loadAuthorityCerts({ settingsRepository })
        })
        // act
        const result = await sut.validateRedis(connector)
        // assert
        assert.equal(result, 'ok')
      }
    })
  })

  describe('validatePerforce', function () {
    let p4config

    before(async function () {
      if (process.env.UNIT_ONLY) {
        this.skip()
      } else {
        this.timeout(30000)
        p4config = await runner.startServer('./tmp/p4d/status-unit')
        helpers.establishSuper(p4config)
        // logout so we can test every case
        const p4 = helpers.makeP4(p4config)
        p4.cmdSync('logout')
      }
    })

    after(async function () {
      if (process.env.UNIT_ONLY === undefined) {
        this.timeout(30000)
        await runner.stopServer(p4config)
      }
    })

    it('should report not configured', async function () {
      assert.equal(await sut.validatePerforce(null), 'not configured')
      assert.equal(await sut.validatePerforce({}), 'not configured')
    })

    it('should report not ok for bad p4port', async function () {
      // arrange
      const map = new Map()
      // assumes gopher (port 70) is not running on localhost
      map.set('P4PORT', 'ssl:localhost:70')
      map.set('P4USER', 'bruno')
      map.set('P4PASSWD', 'secret123')
      const settingsRepository = new MapSettingsRepository(map)
      const repository = new HelixEntityRepository({ settingsRepository })
      // act
      const result = await sut.validatePerforce(repository)
      // assert
      assert.include(result, 'Connection refused')
    })

    it('should report not ok for wrong user', async function () {
      // arrange
      const map = new Map()
      map.set('P4PORT', p4config.port)
      map.set('P4USER', 'nosuchuser')
      map.set('P4PASSWD', 'secret123')
      const settingsRepository = new MapSettingsRepository(map)
      const repository = new HelixEntityRepository({ settingsRepository })
      // act
      const result = await sut.validatePerforce(repository)
      // assert
      assert.include(result, "User nosuchuser doesn't exist")
    })

    it('should report not ok for wrong password', async function () {
      // arrange
      const map = new Map()
      map.set('P4PORT', p4config.port)
      map.set('P4USER', p4config.user)
      map.set('P4PASSWD', 'wrongpassword')
      const settingsRepository = new MapSettingsRepository(map)
      const repository = new HelixEntityRepository({ settingsRepository })
      // act
      const result = await sut.validatePerforce(repository)
      // assert
      assert.include(result, 'Password invalid')
    })

    it('should report ok for working connection', async function () {
      // arrange
      const map = new Map()
      map.set('P4PORT', p4config.port)
      map.set('P4USER', p4config.user)
      map.set('P4PASSWD', p4config.password)
      const settingsRepository = new MapSettingsRepository(map)
      const repository = new HelixEntityRepository({ settingsRepository })
      // act
      const result = await sut.validatePerforce(repository)
      // assert
      assert.equal(result, 'ok')
    })
  })


  describe('getVersion', function () {
    it('should return a string', async function () {
      const result = await sut.getVersion()
      assert.isString(result, 'version is a string')
    })
  })
})

// Generate a new self-signed certificate that expires in less time than the
// system under test will tolerate.
function makeExpiringCert (keyfile, certfile) {
  const params = [
    'req', '-sha256', '-x509', '-nodes', '-days', '5',
    '-newkey', 'rsa:4096', '-keyout', keyfile, '-out', certfile,
    '-subj', '/CN=FakeAuthority'
  ]
  return new Promise((resolve, reject) => {
    invokeOpenssl(params, (code, err, out) => {
      if (code === 0) {
        resolve(out)
      } else {
        reject(new Error(err + out))
      }
    }).on('error', (err) => {
      reject(new Error(err))
    })
  })
}

function convertToPfx (keyfile, certfile, pfxfile) {
  const params = [
    'pkcs12', '-export', '-inkey', keyfile, '-in', certfile, '-out', pfxfile,
    '-passin', 'pass:', '-passout', 'pass:'
  ]
  return new Promise((resolve, reject) => {
    invokeOpenssl(params, (code, err, out) => {
      if (code === 0) {
        resolve(out)
      } else {
        reject(new Error(err + out))
      }
    }).on('error', (err) => {
      reject(new Error(err))
    })
  })
}

function invokeOpenssl (params, cb) {
  const stdout = []
  const stderr = []
  const proc = spawn('openssl', params);
  proc.stdout.on('data', (data) => {
    stdout.push(data.toString())
  })
  proc.stderr.on('data', (data) => {
    stderr.push(data.toString())
  })
  proc.on('close', (code) => {
    cb.call(null, code, stderr.join(), stdout.join())
  })
  return proc
}
