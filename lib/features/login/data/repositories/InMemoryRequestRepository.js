//
// Copyright 2020-2021 Perforce Software
//
import * as assert from 'node:assert'
import loki from 'lokijs'
import { Request } from 'helix-auth-svc/lib/features/login/domain/entities/Request.js'
import { RequestRepository } from 'helix-auth-svc/lib/features/login/domain/repositories/RequestRepository.js'

 
const db = new loki('login-resources.db')
const requests = db.addCollection('requests', { indices: ['key'] })

//
// Implementation of the request repository that uses an in-memory data store.
//
class InMemoryRequestRepository extends RequestRepository {
  constructor ({ settingsRepository }) {
    super()
    const cacheTtl = settingsRepository.getInt('CACHE_TTL') * 1000
    requests.setTTL(cacheTtl, cacheTtl / 2)
  }

  add (requestIdentifier, requestModel) {
    assert.ok(requestIdentifier, 'memory add: request identifier must be defined')
    assert.ok(requestModel, 'request entity/model must be defined')
    const record = Object.assign({}, requestModel, { key: requestIdentifier })
    requests.insert(record)
  }

  get (requestIdentifier) {
    assert.ok(requestIdentifier, 'memory get: request identifier must be defined')
    const record = requests.findOne({ key: requestIdentifier })
    if (record) {
      const tRequest = new Request(record._id, record._userId, record._forceAuthn)
      return Promise.resolve(tRequest)
    }
    return Promise.resolve(null)
  }
}

export { InMemoryRequestRepository }
