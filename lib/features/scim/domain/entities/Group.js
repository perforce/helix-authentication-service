//
// Copyright 2021 Perforce Software
//
const assert = require('assert')

module.exports = class Group {
  constructor (displayName, members) {
    assert.ok(displayName, 'group: displayName must be defined')
    assert.ok(members, 'group: members must be defined')
    this.displayName = displayName
    this.members = members
  }

  // Create a deep-clone of the group object.
  clone () {
    return new Group(this.displayName, this.members)
  }

  // Return true if this group and other are identical, false otherwise.
  equals (other) {
    if (this.displayName !== other.displayName) {
      return false
    }
    if (this.members.length !== other.members.length) {
      return false
    }
    if (this.members.length > 0) {
      const ours = new Set()
      this.members.forEach((e) => ours.add(e.value))
      const membersEqual = other.members.reduce((acc, elem) => {
        return acc && ours.has(elem.value)
      }, true)
      if (!membersEqual) {
        return false
      }
    }
    // all other properties are not pertinent to our application
    return true
  }
}
