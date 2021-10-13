//
// Copyright 2021 Perforce Software
//
const assert = require('assert')
const { P4 } = require('p4api')

/* global include */
const { makeGroup, makeUser } = include('lib/features/scim/data/repositories/common')
const EntityRepository = include('lib/features/scim/domain/repositories/EntityRepository')

async function maybeSetPassword (p4, user) {
  if (user.password) {
    const password = `${user.password}\n${user.password}`
    const passwdCmd = await p4.cmd(`passwd ${user.username}`, password)
    if (passwdCmd.info[0].data !== 'Password updated.') {
      throw new Error(passwdCmd.info[0].data)
    }
  }
}

async function updateUserKey (p4, user) {
  const keyGet = await p4.cmd(`key scim-user-${user.username}`)
  const value = keyGet.stat[0].value
  const json = (value === '0') ? {} : JSON.parse(value)
  if (user.userName !== user.username) {
    // The original userName and our shortened value differ, need to keep track
    // using keys to support filtering by the original userName.
    json.userName = user.userName
    await p4.cmd(`key scim-user-${user.username} "${JSON.stringify(json)}"`)
  } else if (json.userName) {
    // We no longer need the original userName, as the new value equals the
    // shortened value we produced.
    delete json.userName
    const str = JSON.stringify(json)
    if (str === '{}') {
      // There is nothing left of this user key, delete it.
      await p4.cmd(`key -d scim-user-${user.username}`)
    } else {
      await p4.cmd(`key scim-user-${user.username} "${str}"`)
    }
  }
}

async function groupExists (p4, groupname) {
  // detect if the group actually exists in the database using groups -v since
  // it seems to be the only means for accurate detection
  const groupExists = await p4.cmd(`groups -v ${groupname}`)
  if (groupExists.stat) {
    return true
  }
  // check for the group key in case the group was created without members
  const keyGet = await p4.cmd(`key scim-group-${groupname}`)
  return keyGet.stat[0].value !== '0'
}

function readMultipleValues (spec, field) {
  const values = []
  let index = 0
  // "while true" without evoking eslint's wrath
  while (index >= 0) {
    const value = spec[`${field}${index}`]
    if (value) {
      values.push(value)
    } else {
      break
    }
    index++
  }
  return values
}

function writeMultipleValues (spec, field, members) {
  members.forEach((element, index) => {
    spec[`${field}${index}`] = element
  })
}

// Separate a list of { value: ... } into users and groups, without the leading
// `user-` and `group-` prefix on each value, yielding lists of names suitable
// for entering directly into a Group spec.
function groomUsersAndGroups (members) {
  return members.reduce((result, element) => {
    if (element.value.startsWith('user-')) {
      result[0].push(element.value.substr(5))
    } else if (element.value.startsWith('group-')) {
      result[1].push(element.value.substr(6))
    } else {
      // assume the member is a user
      result[0].push(element.value)
    }
    return result
  }, [[], []])
}

//
// Implementation of the entity repository that uses Helix Core Server.
//
module.exports = class HelixEntityRepository extends EntityRepository {
  constructor ({ settingsRepository }) {
    super()
    this.config = {
      port: settingsRepository.get('P4PORT'),
      user: settingsRepository.get('P4USER'),
      password: settingsRepository.get('P4PASSWD')
    }
  }

  async makeP4 () {
    const p4 = new P4({
      P4PORT: this.config.port,
      P4USER: this.config.user,
      P4PASSWD: this.config.password
    })
    await p4.cmd('login', this.config.password)
    return p4
  }

  async addUser (user) {
    assert.ok(user, 'helix addUser: user must be defined')
    const p4 = await this.makeP4()
    // ensure user does not already exist in the database
    const usersOut = await p4.cmd(`users ${user.username}`)
    if (usersOut.stat) {
      throw new Error('user already exists')
    }
    const p4user = {
      User: user.username,
      Email: user.email,
      FullName: user.fullname
    }
    const userIn = await p4.cmd('user -i -f', p4user)
    if (userIn.error) {
      throw new Error(userIn.error[0].data)
    }
    if (userIn.info[0].data !== `User ${user.username} saved.`) {
      throw new Error(userIn.info[0].data)
    }
    await maybeSetPassword(p4, user)
    await updateUserKey(p4, user)
    return makeUser(user.userName, user.email, user.fullname)
  }

  async updateUser (user) {
    assert.ok(user, 'helix updateUser: user must be defined')
    const model = makeUser(user.userName, user.email, user.fullname)
    const p4 = await this.makeP4()
    const p4user = {
      User: model.username,
      Email: model.email,
      FullName: model.fullname
    }
    const userIn = await p4.cmd('user -i -f', p4user)
    if (userIn.error) {
      throw new Error(userIn.error[0].data)
    }
    if (userIn.info[0].data !== `User ${model.username} saved.`) {
      throw new Error(userIn.info[0].data)
    }
    await maybeSetPassword(p4, user)
    await updateUserKey(p4, user)
    return model
  }

  async renameUser (oldname, newname) {
    assert.ok(oldname, 'helix renameUser: oldname must be defined')
    assert.ok(newname, 'helix renameUser: newname must be defined')
    const p4 = await this.makeP4()
    const alt = makeUser(oldname, oldname, oldname)
    const neu = makeUser(newname, newname, newname)
    if (alt.username === neu.username) {
      // internal user names are identical, nothing to do
      return
    }
    const renameOut = await p4.cmd(`renameuser --from=${alt.username} --to=${neu.username}`)
    if (renameOut.error) {
      throw new Error(renameOut.error[0].data)
    }
    if (renameOut.info[0].data !== `User ${alt.username} renamed to ${neu.username}.`) {
      throw new Error(renameOut.info[0].data)
    }
  }

  async getUser (username) {
    assert.ok(username, 'helix getUser: username must be defined')
    const p4 = await this.makeP4()
    // (re)construct the shortened username to find the key and user
    const model = makeUser(username, username, username)
    // ensure user actually exists in the database
    const usersOut = await p4.cmd(`users ${model.username}`)
    if (usersOut.error) {
      return null
    }
    const userOut = await p4.cmd(`user -o ${model.username}`)
    // userOut.stat looks something like this:
    // [{
    //   code: 'stat',
    //   User: 'bruno',
    //   Update: '1628898672',
    //   Access: '1628898672',
    //   FullName: 'Bruno Venus',
    //   Email: 'bruno@example.com',
    //   Type: 'standard',
    //   Password: 'enabled'
    // }]
    const spec = userOut.stat[0]
    const user = makeUser(spec.User, spec.Email, spec.FullName)
    if (username !== model.username) {
      // restore the original userName
      user.userName = username
    }
    user.updated = new Date(Number.parseInt(spec.Update) * 1000)
    user.created = user.updated
    return user
  }

  // eslint-disable-next-line no-unused-vars
  async getUsers (query) {
    const p4 = await this.makeP4()
    const keysGet = await p4.cmd('keys -e "scim-user-*"')
    const keyMap = new Map()
    if (keysGet.stat) {
      keysGet.stat.forEach((e) => {
        keyMap[e.key] = JSON.parse(e.value)
      })
    }
    const usersOut = await p4.cmd('users -a')
    return usersOut.stat.map((e) => {
      const user = makeUser(e.User, e.Email, e.FullName)
      const key = `scim-user-${user.username}`
      if (keyMap[key]) {
        // restore the original userName
        user.userName = keyMap[key].userName
      }
      return user
    })
  }

  async removeUser (username) {
    assert.ok(username, 'helix removeUser: username must be defined')
    const p4 = await this.makeP4()
    // (re)construct the shortened username to find the key and user
    const model = makeUser(username, username, username)
    // ignore any errors removing non-existent users
    await p4.cmd(`user -f -d ${model.username}`)
    // ignore any errors removing non-existent keys
    await p4.cmd(`key -d scim-user-${model.username}`)
  }

  async addGroup (group) {
    assert.ok(group, 'helix addGroup: group must be defined')
    const p4 = await this.makeP4()
    // ensure group does not already exist in the database
    if (await groupExists(p4, group.displayName)) {
      throw new Error('group already exists')
    }
    const p4group = {
      Group: group.displayName
    }
    const [usernames, groupnames] = groomUsersAndGroups(group.members)
    writeMultipleValues(p4group, 'Users', usernames)
    writeMultipleValues(p4group, 'Subgroups', groupnames)
    const groupIn = await p4.cmd('group -i', p4group)
    if (groupIn.error) {
      throw new Error(groupIn.error[0].data)
    }
    // p4d does not create groups without members
    const expectedData = group.members.length
      ? `Group ${group.displayName} created.`
      : `Group ${group.displayName} not created.`
    if (groupIn.info[0].data !== expectedData) {
      throw new Error(groupIn.info[0].data)
    }
    // set a key to remember that we created the group, even if empty
    await p4.cmd(`key -i scim-group-${group.displayName}`)
    return makeGroup(group.displayName, group.members)
  }

  async updateGroup (group) {
    assert.ok(group, 'helix updateGroup: group must be defined')
    const p4 = await this.makeP4()
    const p4group = {
      Group: group.displayName
    }
    const [usernames, groupnames] = groomUsersAndGroups(group.members)
    writeMultipleValues(p4group, 'Users', usernames)
    writeMultipleValues(p4group, 'Subgroups', groupnames)
    const groupIn = await p4.cmd('group -i', p4group)
    if (groupIn.error) {
      throw new Error(groupIn.error[0].data)
    }
    const acceptableResponses = [
      // client may have made an identical patch request again
      `Group ${group.displayName} not updated.`,
      `Group ${group.displayName} created.`,
      // p4d will delete groups that no longer have members
      `Group ${group.displayName} deleted.`
    ]
    if (!acceptableResponses.includes(groupIn.info[0].data)) {
      throw new Error(groupIn.info[0].data)
    }
    return makeGroup(group.displayName, group.members)
  }

  async getGroup (groupname) {
    assert.ok(groupname, 'helix getGroup: groupname must be defined')
    const p4 = await this.makeP4()
    const model = makeGroup(groupname, [])
    // ensure group actually exists in the database
    if (await groupExists(p4, model.displayName) === false) {
      return null
    }
    const groupOut = await p4.cmd(`group -o ${model.displayName}`)
    // groupOut.stat looks something like this:
    // stat: [{
    //   code: 'stat',
    //   Group: 'foobar',
    //   MaxResults: 'unset',
    //   MaxScanRows: 'unset',
    //   MaxLockTime: 'unset',
    //   MaxOpenFiles: 'unset',
    //   Timeout: '43200',
    //   PasswordTimeout: 'unset',
    //   Users0: '...',
    //   Subgroups0: '...',
    //   Owners0: '...',
    // }]
    const spec = groupOut.stat[0]
    const usernames = readMultipleValues(spec, 'Users')
    const groupnames = readMultipleValues(spec, 'Subgroups')
    const users = usernames.map((e) => { return { value: 'user-' + e, type: 'User' } })
    const groups = groupnames.map((e) => { return { value: 'group-' + e, type: 'Group' } })
    return makeGroup(spec.Group, users.concat(groups))
  }

  // eslint-disable-next-line no-unused-vars
  async getGroups (query) {
    const p4 = await this.makeP4()
    const groupsFound = new Set()
    const groupsOut = await p4.cmd('groups')
    const groups = groupsOut.stat
      ? groupsOut.stat.map((e) => {
          groupsFound.add(e.group)
          // groups output does not include members, so for now avoid the expense of
          // fetching each group individually until we know we need that data
          return makeGroup(e.group, [])
        })
      : []
    // find any empty groups that p4d would not have created
    const keysGet = await p4.cmd('keys -e "scim-group-*"')
    if (keysGet.stat) {
      keysGet.stat.forEach((e) => {
        const keyGroup = e.key.substr(11)
        if (!groupsFound.has(keyGroup)) {
          groups.push(makeGroup(keyGroup, []))
        }
      })
    }
    return groups
  }

  async removeGroup (groupname) {
    assert.ok(groupname, 'helix removeGroup: groupname must be defined')
    const p4 = await this.makeP4()
    const model = makeGroup(groupname, [])
    // ignore any errors removing non-existent groups
    await p4.cmd(`group -d ${model.displayName}`)
    // ignore any errors removing non-existent keys
    await p4.cmd(`key -d scim-group-${model.displayName}`)
  }
}
