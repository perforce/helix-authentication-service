//
// Copyright 2021 Perforce Software
//

class NoSuchGroupError extends Error {
  constructor (message) {
    super(message)
    this.name = 'NoSuchGroupError'
  }
}

export { NoSuchGroupError }
