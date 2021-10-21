//
// Copyright 2021 Perforce Software
//
import { GroupModel } from 'helix-auth-svc/lib/features/scim/data/models/GroupModel.js'
import { UserModel } from 'helix-auth-svc/lib/features/scim/data/models/UserModel.js'

// Construct a UserModel from the given inputs, whose `id` will be the username
// plus a `user-` prefix. The input username may start with the `user-` prefix.
export function makeUser (username, email, fullname) {
  const basename = username.startsWith('user-') ? username.substr(5) : username
  const user = new UserModel(basename, email, fullname)
  // ensure id is just our username plus the prefix (i.e. not email address)
  user.id = 'user-' + user.username
  return user
}

// Construct a GroupModel from the given inputs, whose `id` will be the display
// name plus a `group-` prefix. The input display name may start with the
// `group-` prefix.
export function makeGroup (displayName, members) {
  let id
  if (displayName.startsWith('group-')) {
    id = displayName
    displayName = displayName.substr(6)
  } else {
    id = 'group-' + displayName
  }
  const group = new GroupModel(displayName, members)
  group.id = id
  return group
}
