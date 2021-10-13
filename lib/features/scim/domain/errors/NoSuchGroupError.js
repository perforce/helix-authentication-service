//
// Copyright 2021 Perforce Software
//

module.exports = class NoSuchGroupError extends Error {
  constructor (message) {
    super(message)
    this.name = 'NoSuchGroupError'
  }
}
