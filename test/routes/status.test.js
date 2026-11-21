//
// Copyright 2026 Perforce Software
//
import { assert } from 'chai'
import { describe, it } from 'mocha'
import express from 'express'
import request from 'supertest'
// Load the test environment before the bulk of our code initializes, otherwise
// it will be too late due to the `import` early-binding behavior.
import 'helix-auth-svc/test/env.js'
import statusRouter from 'helix-auth-svc/routes/status.js'

describe('Status route', function () {
  it('should report redis as not configured when Redis is not configured', async function () {
    // the test environment does not define REDIS_URL or a Sentinel config, so
    // the in-memory connector is used and should not count as an error; the
    // redisConnector must be awaited since it is an async factory (HAS-739)
    const app = express()
    app.use('/status', statusRouter)
    const res = await request(app).get('/status').expect(200)
    assert.equal(res.body.redis, 'not configured')
    assert.notInclude(String(res.body.status), 'TypeError')
  })
})
