//
// Copyright 2020-2021 Perforce Software
//

//
// Defines the interface for persisting request entities.
//
// Requests may be orphaned if a login request never completes. Thus it is
// necessary for the request repository to ensure that old entries are removed
// several minutes after they are stored.
//
module.exports = class RequestRepository {
  // eslint-disable-next-line no-unused-vars
  add (requestIdentifier, requestModel) {
    return Promise.reject(new Error('not implemented'))
  }

  // eslint-disable-next-line no-unused-vars
  get (requestIdentifier) {
    return Promise.reject(new Error('not implemented'))
  }
}
