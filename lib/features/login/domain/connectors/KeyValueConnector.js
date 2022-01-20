//
// Copyright 2021 Perforce Software
//

//
// Defines the interface for connecting to key-value stores.
//
class KeyValueConnector {
  client () {
    throw new Error('not implemented')
  }

  // eslint-disable-next-line no-unused-vars
  set (key, value) {
    return Promise.reject(new Error('not implemented'))
  }

  // eslint-disable-next-line no-unused-vars
  get (key) {
    return Promise.reject(new Error('not implemented'))
  }
}

export { KeyValueConnector }
