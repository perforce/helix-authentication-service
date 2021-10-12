//
// Copyright 2020-2021 Perforce Software
//
const assert = require('assert')
/* global include */
const Request = include('lib/features/login/domain/entities/Request')
const RequestRepository = include('lib/features/login/domain/repositories/RequestRepository')
const redis = require('redis')
const client = redis.createClient({ url: process.env.REDIS_URL })

client.on('error', (err) => {
  console.error(err)
})

//
// Implementation of the request repository that uses redis key/value store.
//
module.exports = class RedisRequestRepository extends RequestRepository {
  add (requestIdentifier, requestModel) {
    assert.ok(requestIdentifier, 'redis add: request identifier must be defined')
    assert.ok(requestModel, 'request entity/model must be defined')
    client.set(requestIdentifier, requestModel.toJson())
  }

  get (requestIdentifier) {
    assert.ok(requestIdentifier, 'redis get: request identifier must be defined')
    return new Promise((resolve, reject) => {
      client.get(requestIdentifier, (err, reply) => {
        if (err) {
          reject(err)
        } else {
          resolve(reply ? Request.fromJson(reply) : null)
        }
      })
    })
  }
}
