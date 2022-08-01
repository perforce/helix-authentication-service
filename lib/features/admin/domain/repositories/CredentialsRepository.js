//
// Copyright 2022 Perforce Software
//

//
// Defines the interface for validating admin credentials.
//
class CredentialsRepository {
  // Return true if the username/password matches expectations.
  //
  // eslint-disable-next-line no-unused-vars
  verify (username, password) {
    throw new Error('not implemented')
  }
}

export { CredentialsRepository }
