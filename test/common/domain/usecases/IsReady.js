//
// Copyright 2024 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { describe, it } from 'mocha'
import { RequestError } from 'helix-auth-svc/lib/common/domain/errors/RequestError.js'
import IsReady from 'helix-auth-svc/lib/common/domain/usecases/IsReady.js'
import { DummyRedisConnector } from 'helix-auth-svc/lib/features/login/data/connectors/DummyRedisConnector.js'
import { KeyValueConnector } from 'helix-auth-svc/lib/features/login/domain/connectors/KeyValueConnector.js'

describe('IsReady use case', function () {
  it('should raise an error for invalid input', function () {
    assert.throws(() => IsReady({ redisConnector: null }), AssertionError)
  })

  it('should return false if not using redis', async function () {
    const connector = new DummyRedisConnector()
    const usecase = IsReady({ redisConnector: connector })
    const result = await usecase()
    assert.isFalse(result)
  })

  it('should return true if redis is working', async function () {
    const connector = new ResponsiveRedisConnector()
    const usecase = IsReady({ redisConnector: connector })
    const result = await usecase()
    assert.isTrue(result)
  })

  it('should raise error if redis is not working', async function () {
    const connector = new FailingRedisConnector()
    const usecase = IsReady({ redisConnector: connector })
    try {
      await usecase()
      assert.fail('should have raised error')
    } catch (err) {
      assert.instanceOf(err, RequestError)
    }
  })
})

class ResponsiveRedisConnector extends KeyValueConnector {
  constructor() {
    super()
  }

  client() {
    return {
      ping: (value) => {
        return value
      }
    }
  }

  // eslint-disable-next-line no-unused-vars
  set(key, value) {
  }

  // eslint-disable-next-line no-unused-vars
  get(key) {
  }

  // eslint-disable-next-line no-unused-vars
  take(key) {
  }
}

class FailingRedisConnector extends KeyValueConnector {
  constructor() {
    super()
  }

  client() {
    return {
      ping: () => {
        return 'oh no'
      }
    }
  }

  // eslint-disable-next-line no-unused-vars
  set(key, value) {
  }

  // eslint-disable-next-line no-unused-vars
  get(key) {
  }

  // eslint-disable-next-line no-unused-vars
  take(key) {
  }
}
