//
// Copyright 2024 Perforce Software
//
import * as assert from 'node:assert'
import { Group } from 'helix-auth-svc/lib/features/scim/domain/entities/Group.js'
import { lowerClone } from 'helix-auth-svc/lib/features/scim/data/models/common.js'

//
// External interface support for the Group entity.
//
class GroupModel extends Group {
  // Convert to the SCIM structure.
  toJson({ excludedAttributes = [] } = {}) {
    const created = this.created || new Date()
    const updated = this.updated || new Date()
    const result = {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
      // The id property may be set by the repository implementation, otherwise
      // it should default to displayName given by the provider.
      id: this.id || this.displayName,
      externalId: this.externalId,
      displayName: this.displayName,
      members: this.members,
      meta: {
        resourceType: 'Group',
        created: created.toISOString(),
        lastModified: updated.toISOString()
      }
    }
    for (let name of excludedAttributes) {
      // certain fields are required
      if (name != 'displayName') {
        delete result[name]
      }
    }
    return result
  }

  // Produce a possibly concise version of the group for logging.
  forLogging() {
    const json = this.toJson()
    if (json.members.length > 10) {
      json.members = json.members.slice(0, 10)
    }
    return json
  }

  // Convert from the SCIM structure.
  static fromJson(json) {
    assert.ok(json, 'group model: json must be defined')
    const obj = lowerClone(json)
    assert.ok(obj.schemas, 'group model: schemas must be defined')
    assert.ok(obj.schemas.includes('urn:ietf:params:scim:schemas:core:2.0:Group'),
      'group model: schema must include scim:schemas:core:2.0:Group')
    const model = new GroupModel(obj.displayname, obj.members)
    if ('externalid' in obj) {
      model.externalId = obj.externalid
    }
    return model
  }

  // Convert to a P4 group specification.
  toSpec() {
    const p4group = {
      Group: this.displayName
    }
    const [usernames, groupnames] = groomUsersAndGroups(this.members)
    writeMultipleValues(p4group, 'Users', usernames)
    writeMultipleValues(p4group, 'Subgroups', groupnames)
    if (this.Owners) {
      writeMultipleValues(p4group, 'Owners', this.Owners)
    }
    return p4group
  }

  // Convert from a P4 group specification.
  static fromSpec(spec) {
    assert.ok(spec, 'group model: spec must be defined')
    const owners = readMultipleValues(spec, 'Owners')
    const usernames = readMultipleValues(spec, 'Users')
    const groupnames = readMultipleValues(spec, 'Subgroups')
    const users = usernames.map((e) => { return { value: 'user-' + e, type: 'User' } })
    const groups = groupnames.map((e) => { return { value: 'group-' + e, type: 'Group' } })
    const model = new GroupModel(spec.Group, users.concat(groups))
    model.Description = spec.Description
    model.MaxResults = spec.MaxResults
    model.MaxScanRows = spec.MaxScanRows
    model.MaxLockTime = spec.MaxLockTime
    model.MaxOpenFiles = spec.MaxOpenFiles
    model.MaxMemory = spec.MaxMemory
    model.Owners = owners.length > 0 ? owners : undefined
    model.Timeout = spec.Timeout
    model.PasswordTimeout = spec.PasswordTimeout
    return model
  }

  // Merge this with the given spec data to yield a complete spec.
  mergeSpec(spec) {
    assert.ok(spec, 'group model: spec must be defined')
    const p4group = this.toSpec()
    p4group.Description = spec.Description
    p4group.MaxResults = spec.MaxResults
    p4group.MaxScanRows = spec.MaxScanRows
    p4group.MaxLockTime = spec.MaxLockTime
    p4group.MaxOpenFiles = spec.MaxOpenFiles
    p4group.MaxMemory = spec.MaxMemory
    p4group.Timeout = spec.Timeout
    p4group.PasswordTimeout = spec.PasswordTimeout
    copyMultipleValues(spec, 'Owners', p4group)
    return p4group
  }

  static fromEntity(group) {
    assert.ok(group, 'group model: entity must be defined')
    const model = new GroupModel(group.displayName, group.members)
    model.externalId = group.externalId
    return model
  }
}

function copyMultipleValues(from_spec, field, to_spec) {
  let index = 0
  // "while true" without evoking eslint's wrath
  while (index >= 0) {
    const key = `${field}${index}`
    const value = from_spec[key]
    if (value) {
      to_spec[key] = value
    } else {
      break
    }
    index++
  }
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

export { GroupModel }
