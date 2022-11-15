//
// Copyright 2022 Perforce Software
//

//
// Defines the interface for registering web tokens.
//
class TokenRepository {
  // Return the secret that corresponds to the given audience.
  //
  // eslint-disable-next-line no-unused-vars
  get (audience) {
    throw new Error('not implemented')
  }

  // Set the secret for the audience.
  //
  // eslint-disable-next-line no-unused-vars
  set (audience, secret) {
    throw new Error('not implemented')
  }

  // Remove the registration for the given audience.
  //
  // eslint-disable-next-line no-unused-vars
  delete (audience) {
    throw new Error('not implemented')
  }
}

export { TokenRepository }
