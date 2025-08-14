//
// Copyright 2024 Perforce Software
//
import * as assert from 'node:assert'
import { User } from 'helix-auth-svc/lib/features/scim/domain/entities/User.js'
import { lowerClone } from 'helix-auth-svc/lib/features/scim/data/models/common.js'

function extractFullname(obj) {
  if (obj.name && obj.name.formatted) {
    return obj.name.formatted
  }
  if (obj.displayname) {
    return obj.displayname
  }
  if (obj.name && obj.name.givenname && obj.name.familyname) {
    return `${obj.name.givenname} ${obj.name.familyname}`
  }
  return obj.username
}

//
// External interface support for the User entity.
//
class UserModel extends User {
  // Convert to the SCIM structure.
  toJson({ excludedAttributes = [] } = {}) {
    const created = this.created || new Date()
    const updated = this.updated || new Date()
    const result = {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      id: this.id,
      externalId: this.externalId,
      userName: this.userName,
      displayName: this.fullname,
      name: { formatted: this.fullname },
      emails: [{ value: this.email }],
      active: this.active,
      meta: {
        resourceType: 'User',
        created: created.toISOString(),
        lastModified: updated.toISOString()
      }
    }
    for (let name of excludedAttributes) {
      // certain fields are required
      if (name != 'userName') {
        delete result[name]
      }
    }
    return result
  }

  // Convert from the SCIM structure.
  static fromJson(json) {
    assert.ok(json, 'user model: json must be defined')
    const obj = lowerClone(json)
    assert.ok(obj.schemas, 'user model: schemas must be defined')
    assert.ok(obj.schemas.includes('urn:ietf:params:scim:schemas:core:2.0:User'),
      'user model: schema must include scim:schemas:core:2.0:User')
    let email = obj.username
    if (obj.emails && obj.emails.length) {
      const primary = obj.emails.find((e) => e.primary === true)
      if (primary && primary.value) {
        email = primary.value
      } else {
        const workEmail = obj.emails.find((e) => e.type === 'work')
        if (workEmail && workEmail.value) {
          email = workEmail.value
        } else if (obj.emails[0].value) {
          email = obj.emails[0].value
        }
      }
    }
    const fullname = extractFullname(obj)
    const model = new UserModel(obj.username, email, fullname)
    if ('externalid' in obj) {
      model.externalId = obj.externalid
    }
    if ('active' in obj) {
      model.active = obj.active
    }
    if ('password' in obj) {
      model.password = obj.password
    }
    return model
  }

  // Convert to a P4 user specification.
  toSpec() {
    return {
      User: this.username,
      Email: this.email,
      FullName: this.fullname
    }
  }

  // Convert from a P4 user specification.
  static fromSpec(spec) {
    assert.ok(spec, 'user model: spec must be defined')
    const model = new UserModel(spec.User, spec.Email, spec.FullName)
    model.Update = spec.Update
    model.Access = spec.Access
    model.Type = spec.Type
    model.AuthMethod = spec.AuthMethod
    return model
  }

  // Merge this with the given spec data to yield a complete spec.
  mergeSpec(spec) {
    assert.ok(spec, 'user model: spec must be defined')
    const p4user = this.toSpec()
    p4user.Update = spec.Update
    p4user.Access = spec.Access
    p4user.Type = spec.Type
    p4user.AuthMethod = spec.AuthMethod
    return p4user
  }

  static fromEntity(user) {
    assert.ok(user, 'user model: entity must be defined')
    const model = new UserModel(user.userName, user.email, user.fullname)
    model.externalId = user.externalId
    model.active = user.active
    model.password = user.password
    return model
  }
}

export { UserModel }
