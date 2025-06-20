//
// Copyright 2021 Perforce Software
//

//
// Defines the interface for persisting resource entities.
//
class EntityRepository {
  // Add a new user to the repository.
  //
  // Returns the user object.
  //
  // eslint-disable-next-line no-unused-vars
  addUser (user) {
    return Promise.reject(new Error('not implemented'))
  }

  // Update an existing user in the repository.
  //
  // Returns the user object.
  //
  // eslint-disable-next-line no-unused-vars
  updateUser (user) {
    return Promise.reject(new Error('not implemented'))
  }

  // Rename the user.
  //
  // eslint-disable-next-line no-unused-vars
  renameUser (oldname, newname) {
    return Promise.reject(new Error('not implemented'))
  }

  // Return a single user record, or null if not available.
  //
  // eslint-disable-next-line no-unused-vars
  getUser (username) {
    return Promise.reject(new Error('not implemented'))
  }

  // Return one or more user records matching the given Query.
  //
  // eslint-disable-next-line no-unused-vars
  getUsers (query) {
    return Promise.reject(new Error('not implemented'))
  }

  // Remove a user record from the repository.
  //
  // eslint-disable-next-line no-unused-vars
  removeUser (username) {
    return Promise.reject(new Error('not implemented'))
  }

  // Add a new group to the repository.
  //
  // Returns the group object.
  //
  // eslint-disable-next-line no-unused-vars
  addGroup (group) {
    return Promise.reject(new Error('not implemented'))
  }

  // Update an existing group in the repository.
  //
  // Returns the group object with a 'changed' property set to 'true' if the
  // group was actually changed on the server (otherwise the 'changed' property
  // will not be present).
  //
  // eslint-disable-next-line no-unused-vars
  updateGroup (group) {
    return Promise.reject(new Error('not implemented'))
  }

  // Return a single group record, or null if not available.
  //
  // eslint-disable-next-line no-unused-vars
  getGroup (displayName) {
    return Promise.reject(new Error('not implemented'))
  }

  // Return one or more group records matching the given Query.
  //
  // eslint-disable-next-line no-unused-vars
  getGroups (query) {
    return Promise.reject(new Error('not implemented'))
  }

  // Remove a group record from the repository.
  //
  // eslint-disable-next-line no-unused-vars
  removeGroup (displayName) {
    return Promise.reject(new Error('not implemented'))
  }
}

export { EntityRepository }
