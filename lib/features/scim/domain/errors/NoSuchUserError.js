//
// Copyright 2021 Perforce Software
//

module.exports = class NoSuchUserError extends Error {
  constructor (message) {
    super(message)
    this.name = 'NoSuchUserError'
  }
}
