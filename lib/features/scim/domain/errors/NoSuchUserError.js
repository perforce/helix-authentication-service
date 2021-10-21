//
// Copyright 2021 Perforce Software
//

class NoSuchUserError extends Error {
  constructor (message) {
    super(message)
    this.name = 'NoSuchUserError'
  }
}

export { NoSuchUserError }
