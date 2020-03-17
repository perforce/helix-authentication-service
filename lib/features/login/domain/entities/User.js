//
// Copyright 2020 Perforce Software
//
const assert = require('assert')

//
// User represents what is know about a user logging in to the system.
//
// Aside from the identifier, the rest of the information is provided by the
// identity provider, so the entity itself is a bit sparse.
//
module.exports = class User {
  constructor (id, profile) {
    assert.ok(id, 'id must be defined')
    assert.ok(profile, 'profile must be defined')
    this._id = id
    this._profile = profile
  }

  get id () {
    return this._id
  }

  get profile () {
    return this._profile
  }
}
