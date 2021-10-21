//
// Copyright 2020-2021 Perforce Software
//
import * as assert from 'node:assert'

//
// User represents what is know about a user logging in to the system.
//
// Aside from the identifier, the rest of the information is provided by the
// identity provider, so the entity itself is a bit sparse.
//
class User {
  constructor (id, profile) {
    assert.ok(id, 'user: id must be defined')
    assert.ok(profile, 'user: profile must be defined')
    this._id = id
    this._profile = profile
  }

  get id () {
    return this._id
  }

  get profile () {
    return this._profile
  }

  toJson () {
    return JSON.stringify(this)
  }

  static fromJson (json) {
    const obj = JSON.parse(json)
    return new User(obj._id, obj._profile)
  }
}

export { User }
