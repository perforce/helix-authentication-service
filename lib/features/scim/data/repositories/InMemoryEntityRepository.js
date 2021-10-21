//
// Copyright 2021 Perforce Software
//
import * as assert from 'node:assert'
import loki from 'lokijs'
import { makeGroup, makeUser } from 'helix-auth-svc/lib/features/scim/data/repositories/common.js'
import { EntityRepository } from 'helix-auth-svc/lib/features/scim/domain/repositories/EntityRepository.js'

// eslint-disable-next-line new-cap
const db = new loki('scim-resources.db')
const users = db.addCollection('users', { indices: ['username'] })
const groups = db.addCollection('groups', { indices: ['displayName'] })

function injectMemberType (members) {
  return members.forEach((element) => {
    if ('type' in element === false) {
      if (element.value.startsWith('user-')) {
        element.type = 'User'
      } else if (element.value.startsWith('group-')) {
        element.type = 'Group'
      } else {
        // assume the member is a user
        element.type = 'User'
      }
    }
  })
}

//
// Implementation of the entity repository that uses an in-memory data store.
//
class InMemoryEntityRepository extends EntityRepository {
  addUser (user) {
    assert.ok(user, 'memory addUser: user must be defined')
    return new Promise((resolve, reject) => {
      // search on the original username field, not our shortened value
      const existing = users.findOne({ userName: user.username })
      if (existing !== null) {
        reject(new Error('user already exists'))
      }
      const model = makeUser(user.userName, user.email, user.fullname)
      resolve(users.insert(model))
    })
  }

  updateUser (user) {
    assert.ok(user, 'memory updateUser: user must be defined')
    // eslint-disable-next-line no-unused-vars
    return new Promise((resolve, reject) => {
      // lokijs update is cumbersome, just remove and insert
      const model = makeUser(user.userName, user.email, user.fullname)
      users.findAndRemove({ username: model.username })
      users.insert(model)
      resolve(model)
    })
  }

  renameUser (oldname, newname) {
    assert.ok(oldname, 'memory renameUser: oldname must be defined')
    assert.ok(newname, 'memory renameUser: newname must be defined')
    const alt = makeUser(oldname, oldname, oldname)
    const neu = makeUser(newname, newname, newname)
    if (alt.username === neu.username) {
      // internal user names are identical, nothing to do
      return Promise.resolve()
    }
    // eslint-disable-next-line no-unused-vars
    return new Promise((resolve, reject) => {
      // lokijs update is cumbersome, just remove and insert
      const original = users.findOne({ username: alt.username })
      users.findAndRemove({ username: alt.username })
      // use original userName without our user prefix
      const renamed = original.cloneRename(neu.userName)
      users.insert(renamed)
      resolve()
    })
  }

  getUser (username) {
    assert.ok(username, 'memory getUser: username must be defined')
    // convert the supposed username to the value we use for indexing
    const model = makeUser(username, username, username)
    return Promise.resolve(users.findOne({ username: model.username }))
  }

  getUsers (query) {
    assert.ok(query, 'memory getUsers: query must be defined')
    // just return all of the results and let the use case handle filtering
    return Promise.resolve(users.find())
  }

  removeUser (username) {
    assert.ok(username, 'memory removeUser: username must be defined')
    // convert the supposed username to the value we use for indexing
    const model = makeUser(username, username, username)
    return Promise.resolve(users.findAndRemove({ username: model.username }))
  }

  addGroup (group) {
    assert.ok(group, 'memory addGroup: group must be defined')
    return new Promise((resolve, reject) => {
      const existing = groups.findOne({ displayName: group.displayName })
      if (existing !== null) {
        reject(new Error('group already exists'))
      }
      const model = makeGroup(group.displayName, group.members)
      injectMemberType(model.members)
      resolve(groups.insert(model))
    })
  }

  updateGroup (group) {
    assert.ok(group, 'memory updateGroup: group must be defined')
    // eslint-disable-next-line no-unused-vars
    return new Promise((resolve, reject) => {
      // lokijs update is cumbersome, just remove and insert
      groups.findAndRemove({ displayName: group.displayName })
      const model = makeGroup(group.displayName, group.members)
      injectMemberType(model.members)
      groups.insert(model)
      resolve(model)
    })
  }

  getGroup (groupname) {
    assert.ok(groupname, 'memory getGroup: group name must be defined')
    const model = makeGroup(groupname, [])
    return Promise.resolve(groups.findOne({ displayName: model.displayName }))
  }

  getGroups (query) {
    assert.ok(query, 'memory getGroups: query must be defined')
    // just return all of the results and let the use case handle filtering
    return Promise.resolve(groups.find())
  }

  removeGroup (groupname) {
    assert.ok(groupname, 'memory removeGroup: group name must be defined')
    const model = makeGroup(groupname, [])
    return Promise.resolve(groups.findAndRemove({ displayName: model.displayName }))
  }

  // Test-only operation used to produce reliable tests.
  clearAll () {
    // eslint-disable-next-line no-unused-vars
    return new Promise((resolve, reject) => {
      groups.clear()
      users.clear()
      resolve()
    })
  }
}

export { InMemoryEntityRepository }
