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
import { RedisUserRepository } from 'helix-auth-svc/lib/features/login/data/repositories/RedisUserRepository.js'
import { User } from 'helix-auth-svc/lib/features/login/domain/entities/User.js'

describe('RedisUser repository', function () {
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
        repository = new RedisUserRepository({
          redisConnector: connector,
          settingsRepository
        })
      }
    })

    it('should raise an error for invalid input', function () {
      assert.throws(() => repository.add(null), AssertionError)
      assert.throws(() => repository.add('foobar', null), AssertionError)
      assert.throws(() => repository.take(null), AssertionError)
    })

    it('should return null for missing user entity', async function () {
      // arrange
      const userId = ulid()
      // act
      const user = await repository.take(userId)
      // assert
      assert.isNull(user)
    })

    it('should find an existing user entity once', async function () {
      // arrange
      const userId = 'joeuser'
      const tUser = new User(userId, { name: 'joe', email: 'joe@example.com' })
      repository.add(userId, tUser)
      // act
      const user = await repository.take(userId)
      // assert
      assert.equal(user.id, userId)
      assert.property(user, 'profile')
      assert.property(user.profile, 'email')
      // cannot retrieve the same entity a second time
      assert.isNull(await repository.take(userId))
    })

    it('should clear expired user entries', function (done) {
      this.timeout(5000)
      // arrange
      const userId = 'joesample'
      const tUser = new User(userId, { name: 'joe', email: 'joe@example.com' })
      // act
      repository.add(userId, tUser)
      // assert
      setTimeout(() => {
        repository.take(userId).then((value) => {
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
        repository = new RedisUserRepository({
          redisConnector: connector,
          settingsRepository
        })
      }
    })

    it('should find an existing user entity once', async function () {
      // arrange
      const userId = 'joeuser'
      const tUser = new User(userId, { name: 'joe', email: 'joe@example.com' })
      repository.add(userId, tUser)
      // act
      const user = await repository.take(userId)
      // assert
      assert.equal(user.id, userId)
      assert.property(user, 'profile')
      assert.property(user.profile, 'email')
      // cannot retrieve the same entity a second time
      assert.isNull(await repository.take(userId))
    })
  })
})
