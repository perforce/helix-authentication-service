//
// Copyright 2023 Perforce Software
//

//
// Defines the interface for reading and writing configuration settings to a
// persistent data store. Typically goes through a data source configured via
// the constructor.
//
class ConfigurationRepository {
  // Asynchronoulsy read the existing settings from the persistent store.
  read () {
    return Promise.reject(new Error('not implemented'))
  }

  // Synchronously read the existing settings from the persistent store.
  readSync() {
    throw new Error('not implemented')
  }

  // Asynchronously write the updated settings to the persistent store, merging
  // with any existing settings that are not included in the provided set.
  //
  // eslint-disable-next-line no-unused-vars
  write (updates) {
    return Promise.reject(new Error('not implemented'))
  }
}

export { ConfigurationRepository }
