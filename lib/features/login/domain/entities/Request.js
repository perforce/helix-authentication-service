//
// Copyright 2020 Perforce Software
//
const assert = require('assert')

//
// A Request represents a login request by a user identified by the userId.
//
module.exports = class Request {
  constructor (id, userId, forceAuthn) {
    assert.ok(id, 'request: id must be defined')
    assert.ok(userId, 'request: userId must be defined')
    this._id = id
    this._userId = userId
    this._forceAuthn = forceAuthn
  }

  get id () {
    return this._id
  }

  get userId () {
    return this._userId
  }

  get forceAuthn () {
    return this._forceAuthn
  }

  toJson () {
    return JSON.stringify(this)
  }

  static fromJson (json) {
    const obj = JSON.parse(json)
    return new Request(obj._id, obj._userId, obj._forceAuthn)
  }
}
