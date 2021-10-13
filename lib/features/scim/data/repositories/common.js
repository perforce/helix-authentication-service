//
// Copyright 2021 Perforce Software
//
/* global include */
const GroupModel = include('lib/features/scim/data/models/GroupModel')
const UserModel = include('lib/features/scim/data/models/UserModel')

// Construct a UserModel from the given inputs, whose `id` will be the username
// plus a `user-` prefix. The input username may start with the `user-` prefix.
function makeUser (username, email, fullname) {
  const basename = username.startsWith('user-') ? username.substr(5) : username
  const user = new UserModel(basename, email, fullname)
  // ensure id is just our username plus the prefix (i.e. not email address)
  user.id = 'user-' + user.username
  return user
}

// Construct a GroupModel from the given inputs, whose `id` will be the display
// name plus a `group-` prefix. The input display name may start with the
// `group-` prefix.
function makeGroup (displayName, members) {
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

module.exports = {
  makeGroup,
  makeUser
}
