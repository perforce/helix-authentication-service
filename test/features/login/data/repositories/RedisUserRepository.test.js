//
// Copyright 2020-2021 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { before, describe, it } from 'mocha'
import { RedisConnector } from 'helix-auth-svc/lib/features/login/data/connectors/RedisConnector.js'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'
import { User } from 'helix-auth-svc/lib/features/login/domain/entities/User.js'
import { RedisUserRepository } from 'helix-auth-svc/lib/features/login/data/repositories/RedisUserRepository.js'
import { loadAuthorityCerts } from 'helix-auth-svc/lib/container.js'

describe('RedisUser repository', function () {
  describe('without TLS', function () {
    let repository

    before(function () {
      const map = new Map()
      map.set('REDIS_URL', 'redis://redis.doc:6379')
      const settingsRepository = new MapSettingsRepository(map)
      const connector = new RedisConnector({ settingsRepository })
      repository = new RedisUserRepository({ redisConnector: connector })
    })

    it('should raise an error for invalid input', function () {
      assert.throws(() => repository.add(null), AssertionError)
      assert.throws(() => repository.add('foobar', null), AssertionError)
      assert.throws(() => repository.take(null), AssertionError)
    })

    it('should return null for missing user entity', async function () {
      // act
      const user = await repository.take('foobar')
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
  })

  describe('with TLS', function () {
    let repository

    before(function () {
      const map = new Map()
      map.set('REDIS_URL', 'rediss://rediss.doc:6389')
      map.set('CA_CERT_FILE', './certs/ca.crt')
      const settingsRepository = new MapSettingsRepository(map)
      const connector = new RedisConnector({
        settingsRepository,
        loadAuthorityCerts: loadAuthorityCerts({ settingsRepository }),
        redisCert: './test/client.crt',
        redisKey: './test/client.key'
      })
      repository = new RedisUserRepository({ redisConnector: connector })
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
