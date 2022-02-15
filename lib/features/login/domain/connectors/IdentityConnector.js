//
// Copyright 2022 Perforce Software
//

//
// Defines the interface for connecting to identity providers. Primarily used to
// test the connection with the identity provider.
//
class IdentityConnector {
  async ping () {
    throw new Error('not implemented')
  }
}

export { IdentityConnector }
