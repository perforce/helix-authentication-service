//
// Copyright 2021 Perforce Software
//
const assert = require('assert')

/* global include */
const Group = include('lib/features/scim/domain/entities/Group')
const common = include('lib/features/scim/data/models/common')

//
// External interface support for the Group entity.
//
module.exports = class GroupModel extends Group {
  // Convert to the SCIM structure.
  toJson () {
    const created = this.created || new Date()
    const updated = this.updated || new Date()
    return {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
      // The id property may be set by the repository implementation, otherwise
      // it should default to displayName given by the provider.
      id: this.id || this.displayName,
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
    const obj = common.lowerClone(json)
    assert.ok(obj.schemas, 'group model: schemas must be defined')
    assert.ok(obj.schemas.includes('urn:ietf:params:scim:schemas:core:2.0:Group'),
      'group model: schema must include scim:schemas:core:2.0:Group')
    return new GroupModel(obj.displayname, obj.members)
  }
}
