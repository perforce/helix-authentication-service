//
// Copyright 2021 Perforce Software
//
import * as assert from 'node:assert'

class Group {
  constructor (displayName, members) {
    assert.ok(displayName, 'group: displayName must be defined')
    assert.ok(members, 'group: members must be defined')
    // discard the 'group-' identifier prefix, if any
    const basename = displayName.startsWith('group-') ? displayName.substr(6) : displayName
    this.displayName = basename
    // Produce an identifier that is distinct across users and groups in order
    // to distinquish between users and groups that might have the same name.
    this.id = 'group-' + basename
    this.members = members.map((m) => Object.assign({}, m))
  }

  // Create a deep-clone of the group object.
  clone () {
    const group = new Group(this.displayName, this.members)
    group.externalId = this.externalId
    return group
  }

  // Return true if this group and other are identical, false otherwise.
  equals (other) {
    if (this.displayName !== other.displayName) {
      return false
    }
    if (this.members.length !== other.members.length) {
      return false
    }
    if (this.externalId !== other.externalId) {
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

export { Group }
