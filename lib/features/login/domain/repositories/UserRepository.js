//
// Copyright 2020 Perforce Software
//

//
// Defines the interface for persisting user entities.
//
module.exports = class UserRepository {
  add (userIdentifier, userModel) {
    return Promise.reject(new Error('not implemented'))
  }

  // Return the user record, if available, removing it from the repository.
  // Otherwise returns null to indicate there is no such record.
  take (userIdentifier) {
    return Promise.reject(new Error('not implemented'))
  }
}
