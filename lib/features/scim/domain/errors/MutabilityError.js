//
// Copyright 2021 Perforce Software
//

module.exports = class MutabilityError extends Error {
  constructor (message, field) {
    super(message)
    this.name = 'MutabilityError'
    this.field = field
  }
}
