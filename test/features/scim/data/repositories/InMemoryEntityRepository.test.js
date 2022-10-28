//
// Copyright 2021 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { before, describe, it } from 'mocha'
import { GroupModel } from 'helix-auth-svc/lib/features/scim/data/models/GroupModel.js'
import { UserModel } from 'helix-auth-svc/lib/features/scim/data/models/UserModel.js'
import { Query } from 'helix-auth-svc/lib/features/scim/domain/entities/Query.js'
import { Group } from 'helix-auth-svc/lib/features/scim/domain/entities/Group.js'
import { User } from 'helix-auth-svc/lib/features/scim/domain/entities/User.js'
import GetUsers from 'helix-auth-svc/lib/features/scim/domain/usecases/GetUsers.js'
import { InMemoryEntityRepository } from 'helix-auth-svc/lib/features/scim/data/repositories/InMemoryEntityRepository.js'

describe('InMemoryEntity repository', function () {
  let repository

  before(function () {
    repository = new InMemoryEntityRepository()
  })

  it('should raise an error for invalid input', function () {
    assert.throws(() => repository.addUser(null), AssertionError)
    assert.throws(() => repository.updateUser(null), AssertionError)
    assert.throws(() => repository.getUser(null), AssertionError)
    assert.throws(() => repository.getUsers(null), AssertionError)
    assert.throws(() => repository.addGroup(null), AssertionError)
    assert.throws(() => repository.updateGroup(null), AssertionError)
    assert.throws(() => repository.getGroup(null), AssertionError)
    assert.throws(() => repository.getGroups(null), AssertionError)
  })

  it('should return null for missing user entity', async function () {
    // act
    const user = await repository.getUser('foobar')
    // assert
    assert.isNull(user)
  })

  it('should reject overwriting existing user entity', async function () {
    // arrange
    const userId = 'joeuser'
    const tUser = new User(userId, 'joe@example.com', 'Joe Q. User')
    tUser.password = 'secret123'
    await repository.addUser(tUser)
    // act/assert
    try {
      await repository.addUser(tUser)
      assert.fail('should have raised Error')
    } catch (err) {
      assert.equal(err.message, 'user already exists')
    }
  })

  it('should add and retrieve a single user entity', async function () {
    // arrange
    await repository.clearAll()
    const userId = 'joeuser'
    const tUser = new User(userId, 'joe@example.com', 'Joe Q. User')
    tUser.externalId = '00u1esetdqu3kOXZc697'
    const added = await repository.addUser(tUser)
    assert.instanceOf(added, UserModel)
    assert.equal(added.id, 'user-joeuser')
    // act
    const user = await repository.getUser(userId)
    // assert
    assert.instanceOf(user, UserModel)
    assert.equal(user.id, 'user-joeuser')
    assert.equal(user.externalId, '00u1esetdqu3kOXZc697')
    assert.equal(user.username, 'joeuser')
    assert.equal(user.email, 'joe@example.com')
    assert.equal(user.fullname, 'Joe Q. User')
    // check retrieval by the advertised `id`
    const userById = await repository.getUser('user-joeuser')
    assert.instanceOf(userById, UserModel)
    assert.equal(userById.id, 'user-joeuser')
    assert.equal(userById.externalId, '00u1esetdqu3kOXZc697')
    assert.equal(userById.username, 'joeuser')
  })

  it('should add and retrieve user using original userName', async function () {
    // arrange
    await repository.clearAll()
    const userId = 'joeuser@work.com'
    const tUser = new User(userId, 'joe@example.com', 'Joe Q. User')
    const added = await repository.addUser(tUser)
    assert.instanceOf(added, UserModel)
    assert.equal(added.id, 'user-joeuser')
    // act
    const user = await repository.getUser(userId)
    // assert
    assert.instanceOf(user, UserModel)
    assert.equal(user.id, 'user-joeuser')
    assert.equal(user.username, 'joeuser')
    assert.equal(user.userName, 'joeuser@work.com')
    assert.equal(user.email, 'joe@example.com')
    assert.equal(user.fullname, 'Joe Q. User')
  })

  it('should add and retrieve multiple user entities', async function () {
    // arrange
    await repository.clearAll()
    await repository.addUser(new User('joe1', 'joe1@example.com', 'Joe One'))
    await repository.addUser(new User('joe2', 'joe2@example.com', 'Joe Two'))
    await repository.addUser(new User('joe3', 'joe3@example.com', 'Joe Three'))
    // act
    const query = new Query()
    const users = await repository.getUsers(query)
    // assert
    assert.isNotNull(users)
    assert.lengthOf(users, 3)
    assert.instanceOf(users[0], UserModel)
    assert.instanceOf(users[1], UserModel)
    assert.instanceOf(users[2], UserModel)
    assert.isOk(users.find((e) => e.username === 'joe1'))
    assert.isOk(users.find((e) => e.username === 'joe2'))
    assert.isOk(users.find((e) => e.username === 'joe3'))
  })

  it('should update an existing user entity', async function () {
    // arrange
    await repository.clearAll()
    const userId = 'joeuser'
    const tUserAdd = new User(userId, 'joe@example.com', 'Joe Q. User')
    await repository.addUser(tUserAdd)
    // act
    const tUserUpdate = new User(userId, 'juser@work.com', 'Joseph User')
    const updated = await repository.updateUser(tUserUpdate)
    assert.instanceOf(updated, UserModel)
    assert.equal(updated.id, 'user-joeuser')
    const user = await repository.getUser(userId)
    // assert
    assert.instanceOf(user, UserModel)
    assert.equal(user.username, 'joeuser')
    assert.equal(user.email, 'juser@work.com')
    assert.equal(user.fullname, 'Joseph User')
  })

  it('should rename a user entity', async function () {
    // arrange
    await repository.clearAll()
    const tUserAdd = new User('joeuser', 'joe@example.com', 'Joe Q. User')
    await repository.addUser(tUserAdd)
    // act
    await repository.renameUser('joeuser', 'userjoe')
    // assert
    const olduser = await repository.getUser('joeuser')
    assert.isNull(olduser)
    const newuser = await repository.getUser('userjoe')
    assert.isNotNull(newuser)
  })

  it('should rename a user via the id value', async function () {
    // arrange
    await repository.clearAll()
    const tUserAdd = new User('joeuser', 'joe@example.com', 'Joe Q. User')
    await repository.addUser(tUserAdd)
    // act
    await repository.renameUser('user-joeuser', 'userjoe')
    // assert
    const olduser = await repository.getUser('joeuser')
    assert.isNull(olduser)
    const newuser = await repository.getUser('userjoe')
    assert.isNotNull(newuser)
  })

  it('should rename a user@email entity', async function () {
    // arrange
    await repository.clearAll()
    const tUserAdd = new User('joeuser@dot.com', 'joe@example.com', 'Joe Q. User')
    await repository.addUser(tUserAdd)
    // act
    await repository.renameUser('joeuser@dot.com', 'userjoe@dot.com')
    // assert
    const olduser = await repository.getUser('joeuser@dot.com')
    assert.isNull(olduser)
    const newuser = await repository.getUser('userjoe@dot.com')
    assert.isNotNull(newuser)
  })

  it('should remove an existing user entity', async function () {
    // arrange
    await repository.clearAll()
    const userId = 'joeuser'
    const tUser = new User(userId, 'joe@example.com', 'Joe Q. User')
    await repository.addUser(tUser)
    // act
    await repository.removeUser(userId)
    const user = await repository.getUser(userId)
    await repository.removeUser(userId)
    // assert
    assert.isNull(user)
  })

  it('should remove a user using original userName', async function () {
    // arrange
    await repository.clearAll()
    const userId = 'removeuserOJ@work.com'
    const tUser = new User(userId, 'joe@example.com', 'Joe Q. User')
    await repository.addUser(tUser)
    // act
    await repository.removeUser(userId)
    const user = await repository.getUser(userId)
    await repository.removeUser(userId)
    // assert
    assert.isNull(user)
  })

  it('should find user by original userName', async function () {
    // arrange
    const userId = 'emailuser@example.com'
    const tUser = new User(userId, 'joeuser@work.com', 'Joe E. User')
    await repository.addUser(tUser)
    // act
    const usecase = GetUsers({ entityRepository: repository })
    const query = new Query({
      filter: 'userName eq "emailuser@example.com"'
    })
    const users = await usecase(query)
    // assert
    assert.isNotNull(users)
    assert.lengthOf(users, 1)
    assert.equal(users[0].username, 'emailuser')
    assert.equal(users[0].email, 'joeuser@work.com')
    assert.equal(users[0].fullname, 'Joe E. User')
  })

  it('should return null for missing group entity', async function () {
    // arrange
    await repository.clearAll()
    // act
    const group = await repository.getGroup('foobar')
    // assert
    assert.isNull(group)
  })

  it('should reject overwriting existing group entity', async function () {
    // arrange
    const tGroup = new Group('staff', [])
    await repository.addGroup(tGroup)
    // act/assert
    try {
      await repository.addGroup(tGroup)
      assert.fail('should have raised Error')
    } catch (err) {
      assert.equal(err.message, 'group already exists')
    }
  })

  it('should add and retrieve a single group entity', async function () {
    // arrange
    await repository.clearAll()
    const tGroup = new Group('staff', [])
    const added = await repository.addGroup(tGroup)
    assert.instanceOf(added, GroupModel)
    assert.equal(added.id, 'group-staff')
    // act
    const group = await repository.getGroup('staff')
    // assert
    assert.instanceOf(group, GroupModel)
    assert.equal(group.id, 'group-staff')
    assert.equal(group.displayName, 'staff')
    assert.lengthOf(group.members, 0)
    // check retrieval by the advertised `id`
    const groupById = await repository.getGroup('group-staff')
    assert.instanceOf(groupById, GroupModel)
    assert.equal(groupById.id, 'group-staff')
    assert.equal(groupById.displayName, 'staff')
    assert.lengthOf(groupById.members, 0)
  })

  it('should add and retrieve multiple group entities', async function () {
    // arrange
    await repository.clearAll()
    await repository.addGroup(new Group('admins', []))
    await repository.addGroup(new Group('staff', []))
    await repository.addGroup(new Group('zebras', []))
    // act
    const query = new Query()
    const groups = await repository.getGroups(query)
    // assert
    assert.isNotNull(groups)
    assert.lengthOf(groups, 3)
    assert.isOk(groups.every((e) => e instanceof GroupModel))
    assert.isOk(groups.find((e) => e.displayName === 'admins'))
    assert.isOk(groups.find((e) => e.displayName === 'staff'))
    assert.isOk(groups.find((e) => e.displayName === 'zebras'))
  })

  it('should add and retrieve a group with members', async function () {
    // arrange
    await repository.clearAll()
    await repository.addGroup(new Group('staff', [
      { value: 'user-joe', display: 'Joe Plumber' },
      { value: 'user-mike', display: 'Michael London' },
      { value: 'group-admins' },
      { value: 'user-susan', display: 'Susan Winters' }
    ]))
    // act
    const group = await repository.getGroup('staff')
    // assert
    assert.instanceOf(group, GroupModel)
    assert.equal(group.displayName, 'staff')
    assert.lengthOf(group.members, 4)
    const numGroups = group.members.reduce((acc, e) => e.type === 'Group' ? acc + 1 : acc, 0)
    const numUsers = group.members.reduce((acc, e) => e.type === 'User' ? acc + 1 : acc, 0)
    assert.equal(numGroups, 1)
    assert.equal(numUsers, 3)
    assert.isOk(group.members.find((e) => e.value === 'group-admins'))
    assert.isOk(group.members.find((e) => e.value === 'user-joe'))
    assert.isOk(group.members.find((e) => e.value === 'user-mike'))
    assert.isOk(group.members.find((e) => e.value === 'user-susan'))
  })

  it('should update an existing group entity', async function () {
    // arrange
    await repository.clearAll()
    const tGroupAdd = new Group('staff', [])
    await repository.addGroup(tGroupAdd)
    // act
    const tGroupUpdate = new Group('staff', [
      { value: 'joe', display: 'Joe Plumber' },
      { value: 'susan', display: 'Susan Winters' }
    ])
    const updated = await repository.updateGroup(tGroupUpdate)
    assert.instanceOf(updated, GroupModel)
    assert.equal(updated.id, 'group-staff')
    const group = await repository.getGroup('staff')
    // assert
    assert.instanceOf(group, GroupModel)
    assert.equal(group.displayName, 'staff')
    assert.lengthOf(group.members, 2)
    assert.isOk(group.members.find((e) => e.value === 'joe'))
    assert.isOk(group.members.find((e) => e.value === 'susan'))
  })

  it('should update a group to remove all members', async function () {
    // arrange
    await repository.clearAll()
    const tGroupAdd = new Group('staff', [
      { value: 'user-joe', display: 'Joe Plumber' },
      { value: 'user-susan', display: 'Susan Winters' }
    ])
    await repository.addGroup(tGroupAdd)
    // act
    const tGroupUpdate = new Group('staff', [])
    const updated = await repository.updateGroup(tGroupUpdate)
    assert.instanceOf(updated, GroupModel)
    const group = await repository.getGroup('staff')
    // assert
    assert.instanceOf(group, GroupModel)
    assert.equal(group.displayName, 'staff')
    assert.lengthOf(group.members, 0)
  })

  it('should remove an existing group entity', async function () {
    // arrange
    await repository.clearAll()
    const tGroup = new Group('staff', [])
    await repository.addGroup(tGroup)
    // act
    await repository.removeGroup('staff')
    const group = await repository.getGroup('staff')
    await repository.removeGroup('staff')
    // assert
    assert.isNull(group)
  })
})
