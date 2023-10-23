//
// Copyright 2023 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { before, describe, it } from 'mocha'
import { ulid } from 'ulid'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'
import LoadAuthorityCerts from 'helix-auth-svc/lib/common/domain/usecases/LoadAuthorityCerts.js'
import { RedisConnector } from 'helix-auth-svc/lib/features/login/data/connectors/RedisConnector.js'
import RedisSentinel from 'helix-auth-svc/lib/features/login/data/connectors/RedisSentinel.js'
import { RedisRequestRepository } from 'helix-auth-svc/lib/features/login/data/repositories/RedisRequestRepository.js'
import { Request } from 'helix-auth-svc/lib/features/login/domain/entities/Request.js'

describe('RedisRequest repository', function () {
  describe('without TLS', function () {
    let repository

    before(function () {
      if (process.env.UNIT_ONLY) {
        this.skip()
      } else {
        const settingsRepository = new MapSettingsRepository()
        settingsRepository.set('CACHE_TTL', '2')
        settingsRepository.set('REDIS_URL', 'redis://redis.doc:6379')
        const redisSentinel = RedisSentinel({ settingsRepository })
        const loadAuthorityCerts = LoadAuthorityCerts({ settingsRepository })
        const connector = new RedisConnector({ redisSentinel, settingsRepository, loadAuthorityCerts })
        repository = new RedisRequestRepository({
          redisConnector: connector,
          settingsRepository
        })
      }
    })

    it('should raise an error for invalid input', function () {
      assert.throws(() => repository.add(null), AssertionError)
      assert.throws(() => repository.add('foobar', null), AssertionError)
      assert.throws(() => repository.get(null), AssertionError)
    })

    it('should return null for missing request entity', async function () {
      // arrange
      const requestId = ulid()
      // act
      const request = await repository.get(requestId)
      // assert
      assert.isNull(request)
    })

    it('should find an existing request entity', async function () {
      // arrange
      const requestId = 'request123'
      const userId = 'joeuser'
      const tRequest = new Request(requestId, userId, false)
      repository.add(requestId, tRequest)
      // act
      const request = await repository.get(requestId)
      // assert
      assert.property(request, 'id')
      assert.equal(request.id, requestId)
      assert.property(request, 'userId')
      assert.equal(request.userId, userId)
    })

    it('should clear expired request entries', function (done) {
      this.timeout(5000)
      // arrange
      const requestId = 'request456'
      const userId = 'joesample'
      const tRequest = new Request(requestId, userId, false)
      // act
      repository.add(requestId, tRequest)
      // assert
      setTimeout(() => {
        repository.get(requestId).then((value) => {
          if (value) {
            throw new AssertionError({ message: 'value is not null' })
          }
          done()
        }).catch((err) => done(err))
      }, 4000)
    })
  })

  describe('with TLS', function () {
    let repository

    before(function () {
      if (process.env.UNIT_ONLY) {
        this.skip()
      } else {
        const settingsRepository = new MapSettingsRepository()
        settingsRepository.set('REDIS_URL', 'rediss://rediss.doc:6389')
        settingsRepository.set('REDIS_CERT_FILE', './test/client.crt')
        settingsRepository.set('REDIS_KEY_FILE', './test/client.key')
        settingsRepository.set('CACHE_TTL', '2')
        settingsRepository.set('CA_CERT_FILE', './certs/ca.crt')
        const redisSentinel = RedisSentinel({ settingsRepository })
        const loadAuthorityCerts = LoadAuthorityCerts({ settingsRepository })
        const connector = new RedisConnector({ redisSentinel, settingsRepository, loadAuthorityCerts })
        repository = new RedisRequestRepository({
          redisConnector: connector,
          settingsRepository
        })
      }
    })

    it('should find an existing request entity', async function () {
      // arrange
      const requestId = 'request123'
      const userId = 'joeuser'
      const tRequest = new Request(requestId, userId, false)
      repository.add(requestId, tRequest)
      // act
      const request = await repository.get(requestId)
      // assert
      assert.property(request, 'id')
      assert.equal(request.id, requestId)
      assert.property(request, 'userId')
      assert.equal(request.userId, userId)
    })
  })
})
