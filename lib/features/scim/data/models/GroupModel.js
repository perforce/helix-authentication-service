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
  toJson () {
    const created = this.created || new Date()
    const updated = this.updated || new Date()
    return {
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
  }

  // Convert from the SCIM structure.
  static fromJson (json) {
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

  static fromEntity(group) {
    assert.ok(group, 'group model: entity must be defined')
    const model = new GroupModel(group.displayName, group.members)
    model.externalId = group.externalId
    return model
  }
}

export { GroupModel }
