//
// Copyright 2020-2021 Perforce Software
//
const assert = require('assert')
const { newCache } = require('transitory')
/* global include */
const RequestRepository = include('lib/features/login/domain/repositories/RequestRepository')

// Set up an in-memory cache of the request entities.
const requests = newCache()
  .expireAfterWrite(10 * 60 * 1000)
  .expireAfterRead(5 * 60 * 1000)
  .build()
setInterval(() => requests.cleanUp(), 5 * 60 * 1000)

//
// Implementation of the request repository that uses an in-memory data store.
//
// For now this is kept very simple, no models and no data sources, just plain
// JavaScript objects stored directly in an in-memory data store. If we were to
// introduce an on-disk data store (e.g. RocksDB), then model and data source
// implementations for serializing and deserializing would be prudent.
//
module.exports = class InMemoryRequestRepository extends RequestRepository {
  add (requestIdentifier, requestModel) {
    assert.ok(requestIdentifier, 'memory add: request identifier must be defined')
    assert.ok(requestModel, 'request entity/model must be defined')
    requests.set(requestIdentifier, requestModel)
  }

  get (requestIdentifier) {
    assert.ok(requestIdentifier, 'memory get: request identifier must be defined')
    return Promise.resolve(requests.getIfPresent(requestIdentifier))
  }
}
