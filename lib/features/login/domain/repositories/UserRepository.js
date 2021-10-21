//
// Copyright 2020-2021 Perforce Software
//

//
// Defines the interface for persisting user entities.
//
class UserRepository {
  // eslint-disable-next-line no-unused-vars
  add (userIdentifier, userModel) {
    return Promise.reject(new Error('not implemented'))
  }

  // Return the user record, if available, removing it from the repository.
  // Otherwise returns null to indicate there is no such record.
  //
  // eslint-disable-next-line no-unused-vars
  take (userIdentifier) {
    return Promise.reject(new Error('not implemented'))
  }
}

export { UserRepository }
