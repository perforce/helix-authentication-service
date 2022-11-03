//
// Copyright 2021 Perforce Software
//
import * as assert from 'node:assert'

class User {
  constructor (username, email, fullname) {
    assert.ok(username, 'user: username must be defined')
    assert.ok(email, 'user: email must be defined')
    assert.ok(fullname, 'user: fullname must be defined')
    //
    // This entity mimics the typical structure of a SCIM User entity to allow
    // for easier filtering and sorting using 3rd party modules.
    //
    // Discard the 'user-' identifier prefix, if any, when building the "short"
    // username for the Perforce user, and the subsequent id property.
    const basename = username.startsWith('user-') ? username.substr(5) : username
    // produce a valid username that is not an email address
    const atSign = basename.indexOf('@')
    if (atSign > 0) {
      this.shortUsername = basename.substring(0, atSign)
    } else {
      this.shortUsername = basename
    }
    // retain the username provided by the client for the sake of filtering
    this.userName = username
    // Produce an identifier that is distinct across users and groups in order
    // to distinquish between users and groups that might have the same name.
    this.id = 'user-' + this.shortUsername
    this.emails = [{ value: email }]
    this.displayName = fullname
    this.name = { formatted: fullname }
    this.active = true
    this.password = null
  }

  // Create a deep-clone of the user object.
  clone () {
    // construct using the original user name, not our shortened version
    const user = new User(this.userName, this.email, this.fullname)
    user.password = this.password
    user.externalId = this.externalId
    user.active = this.active
    return user
  }

  // Create a deep-clone of the user object with a new username.
  cloneRename (username) {
    // construct using the original user name, not our shortened version
    const user = new User(username, this.email, this.fullname)
    user.password = this.password
    user.externalId = this.externalId
    user.active = this.active
    return user
  }

  static fromPatch (patched) {
    // construct using the original user name, not our shortened version
    const user = new User(patched.userName, patched.email, patched.fullname)
    user.password = patched.password
    user.externalId = patched.externalId
    if ('active' in patched) {
      // Ensure the 'active' value is coerced into a boolean, as the client may
      // send a proper-cased string representation (e.g. 'False').
      const value = patched.active.toString().toLowerCase()
      if (value === 'true') {
        user.active = true
      } else if (value === 'false') {
        user.active = false
      }
    }
    return user
  }

  // Return true if this user and other are identical, false otherwise.
  equals (other) {
    // compare the original userName, not our shortened version
    if (this.userName !== other.userName ||
        this.email !== other.email ||
        this.fullname !== other.fullname) {
      return false
    }
    if (this.password && other.password && this.password !== other.password) {
      // definitely changing the password
      return false
    }
    if (this.active !== other.active) {
      return false
    }
    if (!this.password && other.password) {
      // probably changing the password
      return false
    }
    // all other properties are not pertinent to our application
    return true
  }

  // Retrieve the "short" username suitable for p4 users.
  get username () {
    return this.shortUsername
  }

  get email () {
    return this.emails[0].value
  }

  set email (value) {
    this.emails[0].value = value
  }

  get fullname () {
    return this.name.formatted
  }

  set fullname (value) {
    this.name.formatted = value
  }
}

export { User }
