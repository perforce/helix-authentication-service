//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'
import * as crypto from 'node:crypto'
import { GroupModel } from 'helix-auth-svc/lib/features/scim/data/models/GroupModel.js'
import { UserModel } from 'helix-auth-svc/lib/features/scim/data/models/UserModel.js'
import { EntityRepository } from 'helix-auth-svc/lib/features/scim/domain/repositories/EntityRepository.js'
import p4pkg from 'p4api'
const { P4 } = p4pkg

async function maybeSetPassword(p4, user) {
  if (user.password) {
    const password = `${user.password}\n${user.password}`
    await p4.cmd(`passwd ${user.username}`, password)
    //
    // LDAP users cannot have their password changed, nor would changing an SSO
    // user's password have any meaning, and possibly would result in an error
    // if the auth-set trigger is not defined.
    //
    // const passwdCmd = await p4.cmd(`passwd ${user.username}`, password)
    // if (passwdCmd.info[0].data !== 'Password updated.') {
    //   throw new Error(passwdCmd.info[0].data)
    // }
  }
}

async function forceLogout(p4, user) {
  await p4.cmd(`logout -a ${user.username}`)
  //
  // Ignore any errors when attempting to force a logout.
  //
  // const logoutCmd = await p4.cmd(`logout -a ${user.username}`)
  // if (logoutCmd.info[0].data !== `User ${user.username} logged out.`) {
  //   throw new Error(logoutCmd.info[0].data)
  // }
}

// Save extra user entity details in a key as needed.
async function updateUserKey(p4, user, domain) {
  const keyGet = await p4.cmd(`key scim-user-${user.username}`)
  if (keyGet.error) {
    throw new Error(keyGet.error[0].data)
  }
  const value = keyGet.stat[0].value
  const json = (value === '0') ? {} : JSON.parse(value)
  if (user.userName !== user.username) {
    // The original userName and our shortened value differ, need to keep track
    // using keys to support filtering by the original userName.
    json.userName = user.userName
  } else if (json.userName) {
    // We no longer need the original userName, as the new value equals the
    // shortened value we produced.
    delete json.userName
  }
  // If a domain is provided, scope the externalId, if any, by that domain, thus
  // different providers will see different values, as appropriate.
  if (domain) {
    if (user.externalId) {
      if (json.externalId === undefined) {
        json.externalId = {}
      }
      json.externalId[domain] = user.externalId
    } else if (json.externalId) {
      delete json.externalId[domain]
    }
  } else {
    if (user.externalId) {
      json.externalId = user.externalId
    } else if (json.externalId) {
      delete json.externalId
    }
  }
  if ('active' in user && user.active === false) {
    json.active = false
  } else if ('active' in json) {
    delete json.active
  }
  const str = JSON.stringify(json)
  if (str === '{}') {
    // There is nothing left of this user key, delete it.
    await p4.cmd(`key -d scim-user-${user.username}`)
  } else if (str !== value) {
    const keySet = await p4.cmd(`key scim-user-${user.username} "${str}"`)
    if (keySet.error) {
      throw new Error(keySet.error[0].data)
    }
  }
}

// Apply changes to the base user entity using values from the user key.
function extendUserFromJson(user, json, domain) {
  if (json.userName) {
    // restore the original userName
    user.userName = json.userName
  }
  if (json.externalId) {
    if (domain) {
      user.externalId = json.externalId[domain]
    } else if (typeof json.externalId === 'string') {
      user.externalId = json.externalId
    }
  }
  if ('active' in json) {
    user.active = json.active
  }
}

async function groupExists(p4, groupname) {
  // detect if the group actually exists in the database using groups -v since
  // it seems to be the only means for accurate detection
  const groupExists = await p4.cmd(`groups -v ${groupname}`)
  if (groupExists.error) {
    throw new Error(groupExists.error[0].data)
  }
  if (groupExists.stat) {
    return true
  }
  // check for the group key in case the group was created without members
  const keyGet = await p4.cmd(`key scim-group-${groupname}`)
  if (keyGet.error) {
    throw new Error(keyGet.error[0].data)
  }
  return keyGet.stat[0].value !== '0'
}

function readMultipleValues(spec, field) {
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

function writeMultipleValues(spec, field, members) {
  members.forEach((element, index) => {
    spec[`${field}${index}`] = element
  })
}

// Separate a list of { value: ... } into users and groups, without the leading
// `user-` and `group-` prefix on each value, yielding lists of names suitable
// for entering directly into a Group spec.
function groomUsersAndGroups(members) {
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

// Ensure that the administrative user is authenticated, logging in with the
// given password if necessary.
async function ensureAuthenticated(p4, password) {
  if (password.match(/^[A-Z0-9]{32}$/)) {
    // The password appears to be a ticket, check if the user is already
    // authenticated and return early if so. We could also use the -P flag to
    // invoke every command with the ticket value, but for now just do this.
    const result = await p4.cmd('login -s')
    if (Array.isArray(result.stat) && result.stat.length && (result.stat[0].AuthedBy || result.stat[0].TicketExpiration)) {
      return
    }
  }
  const loginIn = await p4.cmd('login', password)
  if (loginIn.error) {
    throw new Error(loginIn.error[0].data)
  }
}

//
// Implementation of the entity repository that uses Helix Core Server.
//
class HelixEntityRepository extends EntityRepository {
  constructor({ getProvisioningServers }) {
    super()
    const servers = getProvisioningServers()
    // if there is only one configured server, use that by default
    if (servers.length === 1) {
      this.server = servers[0]
    }
  }

  async makeP4(server) {
    // allow the caller to specify a different server as needed
    const params = server ? server : this.server
    if (params === undefined) {
      throw new Error('no server instances configured')
    }
    if (!params.p4passwd) {
      throw new Error('server p4passwd not specified')
    }
    const p4 = new P4({
      P4PORT: params.p4port,
      P4USER: params.p4user
    })
    await ensureAuthenticated(p4, params.p4passwd)
    return p4
  }

  async addUser(user, server, domain) {
    assert.ok(user, 'helix addUser: user must be defined')
    const model = UserModel.fromEntity(user)
    const p4 = await this.makeP4(server)
    // ensure user does not already exist in the database
    const usersOut = await p4.cmd(`users ${model.username}`)
    if (usersOut.stat) {
      throw new Error('user already exists')
    }
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
    if (user.password) {
      model.password = user.password
    }
    await maybeSetPassword(p4, model)
    await updateUserKey(p4, user, domain)
    model.password = null
    return model
  }

  async updateUser(user, server, domain) {
    assert.ok(user, 'helix updateUser: user must be defined')
    const model = UserModel.fromEntity(user)
    const p4 = await this.makeP4(server)
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
    if ('active' in user && user.active === false) {
      forceLogout(p4, model)
      model.password = crypto.randomUUID()
    } else if (user.password) {
      model.password = user.password
    }
    await maybeSetPassword(p4, model)
    await updateUserKey(p4, user, domain)
    model.password = null
    return model
  }

  async renameUser(oldname, newname, server) {
    assert.ok(oldname, 'helix renameUser: oldname must be defined')
    assert.ok(newname, 'helix renameUser: newname must be defined')
    const p4 = await this.makeP4(server)
    const alt = new UserModel(oldname, oldname, oldname)
    const neu = new UserModel(newname, newname, newname)
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

  async getUser(username, server, domain) {
    assert.ok(username, 'helix getUser: username must be defined')
    const p4 = await this.makeP4(server)
    // (re)construct the shortened username to find the key and user
    const model = new UserModel(username, username, username)
    // ensure user actually exists in the database
    const usersOut = await p4.cmd(`users ${model.username}`)
    if (usersOut.error) {
      return null
    }
    const userOut = await p4.cmd(`user -o ${model.username}`)
    if (userOut.error) {
      throw new Error(userOut.error[0].data)
    }
    const spec = userOut.stat[0]
    const user = new UserModel(spec.User, spec.Email, spec.FullName)
    // check if there is an original "userName" on record
    const keyGet = await p4.cmd(`key scim-user-${user.username}`)
    if (keyGet.error) {
      throw new Error(keyGet.error[0].data)
    }
    const value = keyGet.stat[0].value
    const json = (value === '0') ? {} : JSON.parse(value)
    extendUserFromJson(user, json, domain)
    user.updated = new Date(parseInt(spec.Update, 10) * 1000)
    user.created = user.updated
    return user
  }

  // eslint-disable-next-line no-unused-vars
  async getUsers(query, server, domain) {
    const p4 = await this.makeP4(server)
    const keysGet = await p4.cmd('keys -e "scim-user-*"')
    if (keysGet.error) {
      throw new Error(keysGet.error[0].data)
    }
    const keyMap = new Map()
    if (keysGet.stat) {
      keysGet.stat.forEach((e) => {
        keyMap[e.key] = JSON.parse(e.value)
      })
    }
    const usersOut = await p4.cmd('users -a')
    if (usersOut.error) {
      throw new Error(usersOut.error[0].data)
    }
    return usersOut.stat.map((e) => {
      const user = new UserModel(e.User, e.Email, e.FullName)
      const key = `scim-user-${user.username}`
      if (keyMap[key]) {
        extendUserFromJson(user, keyMap[key], domain)
      }
      return user
    })
  }

  async removeUser(username, server) {
    assert.ok(username, 'helix removeUser: username must be defined')
    const p4 = await this.makeP4(server)
    // (re)construct the shortened username to find the key and user
    const model = new UserModel(username, username, username)
    // ignore any errors removing non-existent users
    await p4.cmd(`user -f -d ${model.username}`)
    // ignore any errors removing non-existent keys
    await p4.cmd(`key -d scim-user-${model.username}`)
  }

  async addGroup(group, server) {
    assert.ok(group, 'helix addGroup: group must be defined')
    assert.doesNotMatch(group.displayName, / /, 'group name must not contain spaces')
    const p4 = await this.makeP4(server)
    // ensure group does not already exist in the database
    if (await groupExists(p4, group.displayName)) {
      throw new Error('group already exists')
    }
    const p4group = {
      Group: group.displayName,
      Owners0: this.server.p4user
    }
    const [usernames, groupnames] = groomUsersAndGroups(group.members)
    writeMultipleValues(p4group, 'Users', usernames)
    writeMultipleValues(p4group, 'Subgroups', groupnames)
    const groupIn = await p4.cmd('group -i', p4group)
    if (groupIn.error) {
      throw new Error(groupIn.error[0].data)
    }
    // p4d does not create groups without members but does with Owners
    const expectedData = `Group ${group.displayName} created.`
    if (groupIn.info[0].data !== expectedData) {
      throw new Error(groupIn.info[0].data)
    }
    // set a key to remember that we created the group, even if empty
    const keyInc = await p4.cmd(`key -i scim-group-${group.displayName}`)
    if (keyInc.error) {
      throw new Error(keyInc.error[0].data)
    }
    return new GroupModel(group.displayName, group.members)
  }

  async updateGroup(group, server) {
    assert.ok(group, 'helix updateGroup: group must be defined')
    const p4 = await this.makeP4(server)
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
      `Group ${group.displayName} updated.`,
      // client may have made an identical patch request again
      `Group ${group.displayName} not updated.`,
      `Group ${group.displayName} created.`,
      // updated an already empty group with no members again (why?)
      `Group ${group.displayName} not created.`,
      // p4d will delete groups that no longer have members
      `Group ${group.displayName} deleted.`
    ]
    if (!acceptableResponses.includes(groupIn.info[0].data)) {
      throw new Error(groupIn.info[0].data)
    }
    return new GroupModel(group.displayName, group.members)
  }

  async getGroup(groupname, server) {
    assert.ok(groupname, 'helix getGroup: groupname must be defined')
    assert.doesNotMatch(groupname, / /, 'group name cannot contain spaces')
    const p4 = await this.makeP4(server)
    const model = new GroupModel(groupname, [])
    // ensure group actually exists in the database
    if (await groupExists(p4, model.displayName) === false) {
      return null
    }
    const groupOut = await p4.cmd(`group -o ${model.displayName}`)
    if (groupOut.error) {
      throw new Error(groupOut.error[0].data)
    }
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
    return new GroupModel(spec.Group, users.concat(groups))
  }

  // eslint-disable-next-line no-unused-vars
  async getGroups(query, server) {
    const p4 = await this.makeP4(server)
    const groupsFound = new Set()
    const groupsOut = await p4.cmd('groups')
    if (groupsOut.error) {
      throw new Error(groupsOut.error[0].data)
    }
    const groups = groupsOut.stat
      ? groupsOut.stat.map((e) => {
        groupsFound.add(e.group)
        // groups output does not include members, so for now avoid the expense of
        // fetching each group individually until we know we need that data
        return new GroupModel(e.group, [])
      })
      : []
    // find any empty groups that p4d would not have created
    const keysGet = await p4.cmd('keys -e "scim-group-*"')
    if (keysGet.error) {
      throw new Error(keysGet.error[0].data)
    }
    if (keysGet.stat) {
      keysGet.stat.forEach((e) => {
        const keyGroup = e.key.substr(11)
        if (!groupsFound.has(keyGroup)) {
          groups.push(new GroupModel(keyGroup, []))
        }
      })
    }
    return groups
  }

  async removeGroup(groupname, server) {
    assert.ok(groupname, 'helix removeGroup: groupname must be defined')
    const p4 = await this.makeP4(server)
    const model = new GroupModel(groupname, [])
    // ignore any errors removing non-existent groups
    await p4.cmd(`group -d ${model.displayName}`)
    // ignore any errors removing non-existent keys
    await p4.cmd(`key -d scim-group-${model.displayName}`)
  }
}

export { HelixEntityRepository }
