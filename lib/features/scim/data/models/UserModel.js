//
// Copyright 2021 Perforce Software
//
import * as assert from 'node:assert'
import { User } from 'helix-auth-svc/lib/features/scim/domain/entities/User.js'
import { lowerClone } from 'helix-auth-svc/lib/features/scim/data/models/common.js'

function extractFullname (obj) {
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
  toJson () {
    const created = this.created || new Date()
    const updated = this.updated || new Date()
    return {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      // The id property may be set by the repository implementation, otherwise
      // it should default to original userName given by the provider.
      id: this.id || this.userName,
      userName: this.userName,
      displayName: this.fullname,
      name: { formatted: this.fullname },
      emails: [{ value: this.email }],
      meta: {
        resourceType: 'User',
        created: created.toISOString(),
        lastModified: updated.toISOString()
      }
    }
  }

  // Convert from the SCIM structure.
  static fromJson (json) {
    assert.ok(json, 'user model: json must be defined')
    const obj = lowerClone(json)
    assert.ok(obj.schemas, 'user model: schemas must be defined')
    assert.ok(obj.schemas.includes('urn:ietf:params:scim:schemas:core:2.0:User'),
      'user model: schema must include scim:schemas:core:2.0:User')
    let email = obj.username
    if (obj.emails && obj.emails.length) {
      const primary = obj.emails.find((e) => e.primary === true)
      if (primary) {
        email = primary.value
      } else {
        const workEmail = obj.emails.find((e) => e.type === 'work')
        if (workEmail) {
          email = workEmail.value
        } else {
          email = obj.emails[0].value
        }
      }
    }
    const fullname = extractFullname(obj)
    const model = new UserModel(obj.username, email, fullname)
    if ('active' in obj) {
      model.active = obj.active
    } else {
      model.active = true
    }
    return model
  }
}

export { UserModel }