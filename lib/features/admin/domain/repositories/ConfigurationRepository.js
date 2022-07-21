//
// Copyright 2022 Perforce Software
//

//
// Defines the interface for persisting configuration settings.
//
class ConfigurationRepository {
  // Read the existing settings from the persistent store.
  //
  // eslint-disable-next-line no-unused-vars
  read () {
    return Promise.reject(new Error('not implemented'))
  }

  // Write the updated settings to the persistent store, merging with any
  // existing settings that are not included in the provided set.
  //
  // eslint-disable-next-line no-unused-vars
  write (updates) {
    return Promise.reject(new Error('not implemented'))
  }
}

export { ConfigurationRepository }
