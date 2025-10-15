//
// Copyright 2023 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { after, before, describe, it } from 'mocha'
import * as helpers from 'helix-auth-svc/test/helpers.js'
import * as runner from 'helix-auth-svc/test/runner.js'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'
import { GroupModel } from 'helix-auth-svc/lib/features/scim/data/models/GroupModel.js'
import { UserModel } from 'helix-auth-svc/lib/features/scim/data/models/UserModel.js'
import { Query } from 'helix-auth-svc/lib/features/scim/domain/entities/Query.js'
import { Group } from 'helix-auth-svc/lib/features/scim/domain/entities/Group.js'
import { User } from 'helix-auth-svc/lib/features/scim/domain/entities/User.js'
import GetUsers from 'helix-auth-svc/lib/features/scim/domain/usecases/GetUsers.js'
import AddGroup from 'helix-auth-svc/lib/features/scim/domain/usecases/AddGroup.js'
import PatchGroup from 'helix-auth-svc/lib/features/scim/domain/usecases/PatchGroup.js'
import { HelixEntityRepository } from 'helix-auth-svc/lib/features/scim/data/repositories/HelixEntityRepository.js'
import GetProvisioningServers from 'helix-auth-svc/lib/features/scim/domain/usecases/GetProvisioningServers.js'
import p4pkg from 'p4api'
const { P4 } = p4pkg

describe('HelixEntity repository', function () {
  const settingsRepository = new MapSettingsRepository()
  const getProvisioningServers = GetProvisioningServers({ settingsRepository })

  before(function () {
    if (process.env.UNIT_ONLY) {
      this.skip()
    }
  })

  describe('Connect using ticket', function () {
    let p4config

    before(async function () {
      this.timeout(60000)
      p4config = await runner.startServer('./tmp/p4d/tickets')
      helpers.establishSuper(p4config)
      settingsRepository.set('P4PORT', p4config.port)
      settingsRepository.set('P4USER', p4config.user)
      settingsRepository.set('P4PASSWD', p4config.password)
      settingsRepository.set('P4TICKETS', p4config.tickets)
      settingsRepository.set('P4TRUST', p4config.trust)
    })

    after(async function () {
      this.timeout(60000)
      await runner.stopServer(p4config)
    })

    it('should detect expired ticket and fail', async function () {
      this.timeout(60000)
      const p4 = new P4({
        P4PORT: p4config.port,
        P4USER: p4config.user,
        P4TICKETS: p4config.tickets,
        P4TRUST: p4config.trust
      })
      const logoutCmd = await p4.cmd('logout -a')
      assert.isOk(logoutCmd.info[0].data)
      settingsRepository.set('P4PASSWD', 'CD9FC48D2F36752258C11CDBBD094EBC')
      const sut = new HelixEntityRepository({ getProvisioningServers })
      try {
        await sut.getUsers()
        assert.fail('should have raised Error')
      } catch (err) {
        assert.include(err.message, 'Password invalid')
      }
      settingsRepository.set('P4PASSWD', p4config.password)
    })

    it('should accept ticket with authenticated session', async function () {
      this.timeout(60000)
      const p4 = new P4({
        P4PORT: p4config.port,
        P4USER: p4config.user,
        P4TICKETS: p4config.tickets,
        P4TRUST: p4config.trust
      })
      // First run 'login -p' in order to get a ticket, but then log in again to
      // get an authenticated connection. Somehow an admin will do this but it
      // is extremely difficult if not impossible to do this programmatically.
      const ticketCmd = await p4.cmd('login -p', 'p8ssword')
      assert.isOk(ticketCmd.info[0].data)
      settingsRepository.set('P4PASSWD', ticketCmd.info[0].data)
      const loginCmd = await p4.cmd('login', 'p8ssword')
      assert.equal(loginCmd.stat[0].TicketExpiration, '43200')
      const sut = new HelixEntityRepository({ getProvisioningServers })
      const users = await sut.getUsers()
      assert.isNotNull(users)
      settingsRepository.set('P4PASSWD', p4config.password)
    })
  })

  describe('Basic Non-SSL', function () {
    let repository
    let p4config

    before(async function () {
      this.timeout(60000)
      p4config = await runner.startServer('./tmp/p4d/non-ssl-repo')
      helpers.establishSuper(p4config)
      settingsRepository.clear()
      settingsRepository.set('P4PORT', p4config.port)
      settingsRepository.set('P4USER', p4config.user)
      settingsRepository.set('P4PASSWD', p4config.password)
      settingsRepository.set('P4TICKETS', p4config.tickets)
      settingsRepository.set('P4TRUST', p4config.trust)
      repository = new HelixEntityRepository({ getProvisioningServers })
    })

    after(async function () {
      this.timeout(60000)
      await runner.stopServer(p4config)
    })

    it('should raise an error for invalid input', async function () {
      this.timeout(60000)
      try {
        await repository.addUser(null)
        assert.fail('should have raised Error')
      } catch (err) {
        assert.instanceOf(err, AssertionError)
      }
      try {
        await repository.updateUser(null)
        assert.fail('should have raised Error')
      } catch (err) {
        assert.instanceOf(err, AssertionError)
      }
      try {
        await repository.getUser(null)
        assert.fail('should have raised Error')
      } catch (err) {
        assert.instanceOf(err, AssertionError)
      }
      // getUsers does not use the query parameter
      // assert.throws(() => repository.getUsers(null), AssertionError)
    })

    it('should return null for missing user entity', async function () {
      this.timeout(60000)
      // act
      const user = await repository.getUser('foobar')
      // assert
      assert.isNull(user)
    })

    it('should reject overwriting existing user entity', async function () {
      this.timeout(60000)
      // arrange
      const userId = 'rejectoverwrite'
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
      this.timeout(60000)
      // arrange
      const tUser = new User('adduser', 'joe@example.com', 'Joe Q. User')
      tUser.externalId = '00u1esetdqu3kOXZc697'
      tUser.password = 'secret123'
      const added = await repository.addUser(tUser)
      assert.instanceOf(added, UserModel)
      assert.equal(added.id, 'user-adduser')
      // act
      const userById = await repository.getUser(added.id)
      // assert
      assert.instanceOf(userById, UserModel)
      assert.equal(userById.id, 'user-adduser')
      assert.equal(userById.externalId, '00u1esetdqu3kOXZc697')
      assert.equal(userById.username, 'adduser')
      assert.equal(userById.email, 'joe@example.com')
      assert.equal(userById.fullname, 'Joe Q. User')
      assert.isTrue(userById.active)
      // retrieve by the plain p4d user name
      const userByName = await repository.getUser(userById.username)
      assert.instanceOf(userByName, UserModel)
      assert.equal(userByName.username, 'adduser')
      assert.equal(userByName.externalId, '00u1esetdqu3kOXZc697')
      assert.equal(userByName.email, 'joe@example.com')
      assert.equal(userByName.fullname, 'Joe Q. User')
      assert.isTrue(userByName.active)
    })

    it('should add and retrieve a single user by model', async function () {
      this.timeout(60000)
      // arrange
      const rawJson = {
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
        userName: 'asmith@p4test.com',
        name: { givenName: 'Alton', familyName: 'Smith' },
        emails: [
          { primary: true, value: 'asmith@p4test.com', type: 'work' }
        ],
        displayName: 'Alton Smith',
        locale: 'en-US',
        externalId: '00udrvv438FuOd5oX5d7',
        groups: [],
        password: 'WchS9ac0',
        active: true
      }
      const tUser = UserModel.fromJson(rawJson)
      const existing = await repository.getUser(tUser.username)
      assert.isNull(existing)
      const added = await repository.addUser(tUser)
      assert.instanceOf(added, UserModel)
      assert.equal(added.id, 'user-asmith')
      // act
      const userById = await repository.getUser(added.id)
      // assert
      assert.instanceOf(userById, UserModel)
      assert.equal(userById.id, 'user-asmith')
      assert.equal(userById.externalId, '00udrvv438FuOd5oX5d7')
      assert.equal(userById.username, 'asmith')
      assert.equal(userById.email, 'asmith@p4test.com')
      assert.equal(userById.fullname, 'Alton Smith')
      assert.isTrue(userById.active)
      // retrieve by the plain p4d user name
      const userByName = await repository.getUser(userById.username)
      assert.instanceOf(userByName, UserModel)
      assert.equal(userByName.username, 'asmith')
      assert.equal(userByName.externalId, '00udrvv438FuOd5oX5d7')
      assert.equal(userByName.email, 'asmith@p4test.com')
      assert.equal(userByName.fullname, 'Alton Smith')
      assert.isTrue(userByName.active)
    })

    it('should add and retrieve user using original userName', async function () {
      this.timeout(60000)
      // arrange
      const userId = 'originalJU@work.com'
      const tUser = new User(userId, 'joe@example.com', 'Joe Q. User')
      const added = await repository.addUser(tUser)
      assert.instanceOf(added, UserModel)
      assert.equal(added.id, 'user-originalJU')
      // act
      const userByEmail = await repository.getUser(userId)
      // assert
      assert.instanceOf(userByEmail, UserModel)
      assert.equal(userByEmail.id, 'user-originalJU')
      assert.equal(userByEmail.username, 'originalJU')
      assert.equal(userByEmail.userName, 'originalJU@work.com')
      assert.equal(userByEmail.email, 'joe@example.com')
      assert.equal(userByEmail.fullname, 'Joe Q. User')
      // act
      const userByName = await repository.getUser('originalJU')
      // assert
      assert.instanceOf(userByName, UserModel)
      assert.equal(userByName.id, 'user-originalJU')
      assert.equal(userByName.username, 'originalJU')
      assert.equal(userByName.userName, 'originalJU@work.com')
      assert.equal(userByName.email, 'joe@example.com')
      assert.equal(userByName.fullname, 'Joe Q. User')
    })

    it('should add and retrieve multiple user entities', async function () {
      this.timeout(60000)
      // arrange
      const tUser1 = new User('joe1', 'joe1@example.com', 'Joe One')
      tUser1.password = 'secret123'
      await repository.addUser(tUser1)
      const tUser2 = new User('joe2', 'joe2@example.com', 'Joe Two')
      tUser2.password = 'secret234'
      await repository.addUser(tUser2)
      const tUser3 = new User('joe3', 'joe3@example.com', 'Joe Three')
      tUser3.password = 'secret345'
      await repository.addUser(tUser3)
      // act
      const query = new Query()
      const users = await repository.getUsers(query)
      // assert
      assert.isNotNull(users)
      // other users have been added by earlier tests
      // assert.lengthOf(users, 3)
      assert.instanceOf(users[0], UserModel)
      assert.isTrue(users.every((e) => e.active))
      assert.isOk(users.find((e) => e.username === 'joe1'))
      assert.isOk(users.find((e) => e.username === 'joe2'))
      assert.isOk(users.find((e) => e.username === 'joe3'))
    })

    it('should ignore prefix when adding user', async function () {
      // It would be rather unexpected that the CSP would use our user prefix
      // when adding a new user, but nonetheless the add and update should
      // behave consistently.
      this.timeout(60000)
      // arrange
      const tUser = new User('user-preadduser', 'joeu@example.com', 'Joe User')
      // act
      const added = await repository.addUser(tUser)
      assert.equal(added.id, 'user-preadduser')
      assert.equal(added.username, 'preadduser')
      // assert
      const user = await repository.getUser('user-preadduser')
      assert.instanceOf(user, UserModel)
      assert.equal(user.id, 'user-preadduser')
      assert.equal(user.username, 'preadduser')
      assert.equal(user.email, 'joeu@example.com')
      assert.equal(user.fullname, 'Joe User')
    })

    it('should update an existing user entity', async function () {
      this.timeout(60000)
      // arrange
      const tUser = new User('updateuser', 'juser@example.com', 'Joe Q. User')
      const added = await repository.addUser(tUser)
      assert.equal(added.id, 'user-updateuser')
      assert.equal(added.username, 'updateuser')
      // act
      // (use the external ID that actual clients will use)
      const tUserUpdate = new User('user-updateuser', 'juser@work.com', 'Joseph User')
      const updated = await repository.updateUser(tUserUpdate)
      assert.instanceOf(updated, UserModel)
      assert.equal(updated.id, 'user-updateuser')
      assert.equal(updated.username, 'updateuser')
      const user = await repository.getUser('user-updateuser')
      // assert
      assert.instanceOf(user, UserModel)
      assert.equal(user.id, 'user-updateuser')
      assert.equal(user.username, 'updateuser')
      assert.equal(user.email, 'juser@work.com')
      assert.equal(user.fullname, 'Joseph User')
      assert.equal(user.AuthMethod, 'perforce')
    })

    it('should retain properties of an existing user', async function () {
      this.timeout(60000)
      // arrange
      const p4 = new P4({
        P4PORT: p4config.port,
        P4USER: p4config.user,
        P4TICKETS: p4config.tickets,
        P4TRUST: p4config.trust
      })
      const p4user = {
        User: 'authmethod',
        Email: 'juser@example.com',
        FullName: 'Joe Q. User',
        AuthMethod: 'ldap',
        Type: 'standard'
      }
      const userIn = await p4.cmd('user -i -f', p4user)
      assert.isOk(userIn.info[0].data)
      let user = await repository.getUser('user-authmethod')
      assert.equal(user.AuthMethod, 'ldap')
      // act
      const tUserUpdate = new User('user-authmethod', 'juser@work.com', 'Joseph User')
      const updated = await repository.updateUser(tUserUpdate)
      assert.instanceOf(updated, UserModel)
      assert.equal(updated.username, 'authmethod')
      // assert
      user = await repository.getUser('user-authmethod')
      assert.instanceOf(user, UserModel)
      assert.equal(user.id, 'user-authmethod')
      assert.equal(user.username, 'authmethod')
      assert.equal(user.email, 'juser@work.com')
      assert.equal(user.fullname, 'Joseph User')
      assert.equal(user.AuthMethod, 'ldap')
    })

    it('should reset password via external identifier', async function () {
      this.timeout(60000)
      // arrange
      const tUser = new User('newpass', 'joe@example.com', 'Joe Q. User')
      tUser.password = 'secret123'
      const added = await repository.addUser(tUser)
      assert.instanceOf(added, UserModel)
      assert.equal(added.id, 'user-newpass')
      // act
      const extUser = new User('user-newpass', 'joe@example.com', 'Joe Q. User')
      extUser.password = 'p4ssw0rd'
      const updated = await repository.updateUser(extUser)
      assert.equal(updated.username, 'newpass')
      assert.isNull(updated.password)
      // assert
      const p4 = new P4({
        P4PORT: p4config.port,
        P4USER: 'newpass',
        P4TICKETS: p4config.tickets,
        P4TRUST: p4config.trust
      })
      const loginCmd4 = await p4.cmd('login', 'p4ssw0rd')
      assert.equal(loginCmd4.stat[0].TicketExpiration, '43200')
    })

    it('should deactivate and reactivate a user entity', async function () {
      this.timeout(60000)

      // create user with known password from JSON for a more thorough test
      const rawJson = {
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
        userName: 'activeuser',
        name: { givenName: 'Active', familyName: 'User' },
        emails: [{ primary: true, value: 'active@example.com', type: 'work' }],
        displayName: 'Active User',
        locale: 'en-US',
        externalId: '00u1esetdqu3kOXZc697',
        groups: [],
        password: 'p4ssw0rd',
        active: true
      }
      const tUserModel = UserModel.fromJson(rawJson)
      const added = await repository.addUser(tUserModel)
      assert.equal(added.id, 'user-activeuser')
      assert.equal(added.username, 'activeuser')
      assert.equal(added.externalId, '00u1esetdqu3kOXZc697')
      assert.isTrue(added.active)
      assert.isNull(added.password)

      // ensure user login successful
      const p4 = new P4({
        P4PORT: p4config.port,
        P4USER: 'activeuser',
        P4TICKETS: p4config.tickets,
        P4TRUST: p4config.trust
      })
      const loginCmd1 = await p4.cmd('login', 'p4ssw0rd')
      assert.equal(loginCmd1.stat[0].TicketExpiration, '43200')

      // update user with active == false
      added.active = false
      const updated = await repository.updateUser(added)
      assert.instanceOf(updated, UserModel)
      assert.isFalse(updated.active)
      assert.isNull(updated.password)

      // ensure user logged out and cannot log in
      const loginCmd2 = await p4.cmd('login -s')
      assert.include(loginCmd2.error[0].data, 'invalid or unset')
      const loginCmd3 = await p4.cmd('login', 'p4ssw0rd')
      assert.include(loginCmd3.error[0].data, 'Password invalid.')

      // ensure active flag is returned as 'false'
      const retrieved = await repository.getUser('user-activeuser')
      assert.equal(retrieved.username, 'activeuser')
      assert.equal(retrieved.externalId, '00u1esetdqu3kOXZc697')
      assert.isFalse(retrieved.active)

      // activate user with new password, test login
      retrieved.active = true
      retrieved.password = 'p4ssw0rd'
      const onceagain = await repository.updateUser(retrieved)
      assert.equal(onceagain.username, 'activeuser')
      assert.isTrue(onceagain.active)
      assert.isNull(onceagain.password)
      const loginCmd4 = await p4.cmd('login', 'p4ssw0rd')
      assert.equal(loginCmd4.stat[0].TicketExpiration, '43200')
    })

    it('should rename a user entity', async function () {
      this.timeout(60000)
      // arrange
      const tUserAdd = new User('renameuser', 'joe@example.com', 'Joe Q. User')
      await repository.addUser(tUserAdd)
      // act
      await repository.renameUser('renameuser', 'userrename')
      // assert
      const olduser = await repository.getUser('renameuser')
      assert.isNull(olduser)
      const newuser = await repository.getUser('userrename')
      assert.isNotNull(newuser)
    })

    it('should rename a user@email entity', async function () {
      this.timeout(60000)
      // arrange
      const tUserAdd = new User('renameuzer@dot.com', 'joe@example.com', 'Joe Q. User')
      await repository.addUser(tUserAdd)
      // act
      await repository.renameUser('renameuzer@dot.com', 'uzerrename@dot.com')
      // assert
      const olduser = await repository.getUser('renameuzer@dot.com')
      assert.isNull(olduser)
      const newuser = await repository.getUser('uzerrename@dot.com')
      assert.isNotNull(newuser)
    })

    it('should rename a user while preserving extra data', async function () {
      this.timeout(60000)
      // arrange
      const rawJson = {
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
        userName: 'pparker@example.com',
        name: { givenName: 'Peter', familyName: 'Parker' },
        emails: [{ primary: true, value: 'pparker@example.com', type: 'work' }],
        displayName: 'Peter Parker',
        locale: 'en-US',
        externalId: '00udrvv438FuOd5oX5d7',
        groups: [],
        password: 'iamspiderman',
        active: true
      }
      const tUser = UserModel.fromJson(rawJson)
      const added = await repository.addUser(tUser)
      assert.instanceOf(added, UserModel)
      assert.equal(added.id, 'user-pparker')
      // act
      await repository.renameUser('pparker@example.com', 'peteparker@example.com')
      // assert
      const olduser = await repository.getUser('pparker@example.com')
      assert.isNull(olduser)
      const newuser = await repository.getUser('peteparker@example.com')
      assert.isNotNull(newuser)
      assert.equal(newuser.id, 'user-peteparker')
      assert.equal(newuser.userName, 'peteparker@example.com')
      assert.equal(newuser.displayName, 'Peter Parker')
      assert.equal(newuser.emails[0].value, 'pparker@example.com')
      assert.isTrue(newuser.active)
      // ensure user key data was updated appropriately
      const p4 = new P4({
        P4PORT: p4config.port,
        P4USER: p4config.user,
        P4TICKETS: p4config.tickets,
        P4TRUST: p4config.trust
      })
      const loginCmd = await p4.cmd('login', 'p8ssword')
      assert.equal(loginCmd.stat[0].TicketExpiration, '43200')
      const keysOut = await p4.cmd('keys')
      const oldKey = keysOut.stat.find((e) => e.key === 'scim-user-pparker')
      assert.isUndefined(oldKey)
      const newKey = keysOut.stat.find((e) => e.key === 'scim-user-peteparker')
      assert.isDefined(newKey)
      assert.include(newKey.value, '"userName":"peteparker@example.com"')
    })

    it('should remove an existing user entity', async function () {
      this.timeout(60000)
      // arrange
      const tUser = new User('removeuser', 'joe@example.com', 'Joe Q. User')
      const added = await repository.addUser(tUser)
      // act
      await repository.removeUser(added.id)
      const user = await repository.getUser(added.id)
      await repository.removeUser(added.id)
      // assert
      assert.isNull(user)
    })

    it('should remove a user using original userName', async function () {
      this.timeout(60000)
      // arrange
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
      this.timeout(60000)
      // arrange
      const userId = 'emailuser@example.com'
      const tUser = new User(userId, 'joeuser@work.com', 'Joe E. User')
      await repository.addUser(tUser)
      // act
      const usecase = GetUsers({ getDomainLeader: () => null, entityRepository: repository })
      const query = new Query({
        filter: 'userName eq "emailuser@example.com"'
      })
      const users = await usecase(query)
      // assert
      assert.isNotNull(users)
      assert.lengthOf(users, 1)
      assert.equal(users[0].id, 'user-emailuser')
      assert.equal(users[0].username, 'emailuser')
      assert.equal(users[0].userName, 'emailuser@example.com')
      assert.equal(users[0].email, 'joeuser@work.com')
      assert.equal(users[0].name.formatted, 'Joe E. User')
      assert.equal(users[0].fullname, 'Joe E. User')
      assert.equal(users[0].displayName, 'Joe E. User')
      assert.isNull(users[0].password)
    })

    it('should return null for missing group entity', async function () {
      this.timeout(60000)
      // act
      const group = await repository.getGroup('foobar')
      // assert
      assert.isNull(group)
    })

    it('should reject overwriting existing group entity', async function () {
      this.timeout(60000)
      // arrange
      const tGroup = new Group('overgroup', [])
      await repository.addGroup(tGroup)
      // act/assert
      try {
        await repository.addGroup(tGroup)
        assert.fail('should have raised Error')
      } catch (err) {
        assert.equal(err.message, 'group already exists')
      }
    })

    it('should reject adding a group with a space character', async function () {
      this.timeout(60000)
      // arrange
      const tGroup = new Group('under group', [])
      // act/assert
      try {
        await repository.addGroup(tGroup)
        assert.fail('should have raised Error')
      } catch (err) {
        assert.equal(err.message, 'group name must not contain spaces')
      }
    })

    it('should reject getting a group with a space character', async function () {
      this.timeout(60000)
      // arrange
      // act/assert
      try {
        await repository.getGroup('has spaces')
        assert.fail('should have raised Error')
      } catch (err) {
        assert.equal(err.message, 'group name cannot contain spaces')
      }
    })

    it('should add and retrieve a single group entity', async function () {
      this.timeout(60000)
      // arrange
      const tGroup = new Group('newgroup', [])
      const added = await repository.addGroup(tGroup)
      assert.instanceOf(added, GroupModel)
      assert.equal(added.id, 'group-newgroup')
      // act
      const groupById = await repository.getGroup(added.id)
      // assert
      assert.instanceOf(groupById, GroupModel)
      assert.equal(groupById.id, 'group-newgroup')
      assert.equal(groupById.displayName, 'newgroup')
      assert.lengthOf(groupById.members, 0)
      assert.equal(groupById.Timeout, 43200)
      // retrieve by the plain p4d group name
      const group = await repository.getGroup('newgroup')
      assert.instanceOf(group, GroupModel)
      assert.equal(group.displayName, 'newgroup')
      assert.lengthOf(group.members, 0)
      assert.equal(group.Timeout, 43200)
    })

    it('should retain properties of an existing group', async function () {
      this.timeout(60000)
      // arrange
      const p4 = new P4({
        P4PORT: p4config.port,
        P4USER: p4config.user,
        P4TICKETS: p4config.tickets,
        P4TRUST: p4config.trust
      })
      const p4group = {
        Group: 'hastimeout',
        Description: 'Group without timeout',
        MaxResults: 'unset',
        MaxScanRows: 'unset',
        MaxLockTime: 'unset',
        MaxOpenFiles: 'unset',
        MaxMemory: 'unset',
        Timeout: '172800',
        PasswordTimeout: 'unset',
        Users0: 'susan'
      }
      const groupIn = await p4.cmd('group -i', p4group)
      assert.isOk(groupIn.info[0].data)
      // act
      const group = await repository.getGroup('hastimeout')
      assert.equal(group.Timeout, 172800)
      const usecase = PatchGroup({
        getDomainLeader: () => null,
        getDomainMembers: () => [],
        entityRepository: repository
      })
      const patch = {
        schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
        Operations: [{
          op: 'Add',
          path: 'members',
          value: [{ value: 'user-joe' }]
        }]
      }
      await usecase('group-hastimeout', patch)
      // assert
      const updated = await repository.getGroup('hastimeout')
      assert.equal(updated.Timeout, 172800)
      assert.equal(updated.Description, 'Group without timeout\n')
      assert.equal(updated.MaxResults, 'unset')
      assert.equal(updated.MaxScanRows, 'unset')
      assert.equal(updated.MaxLockTime, 'unset')
      assert.equal(updated.MaxOpenFiles, 'unset')
      assert.equal(updated.MaxMemory, 'unset')
      assert.equal(updated.PasswordTimeout, 'unset')
      assert.lengthOf(updated.members, 2)
      assert.isOk(updated.members.find((e) => e.value === 'user-joe'))
      assert.isOk(updated.members.find((e) => e.value === 'user-susan'))
    })

    it('should add and retrieve multiple group entities', async function () {
      this.timeout(60000)
      // arrange
      await repository.addGroup(new Group('admins', []))
      await repository.addGroup(new Group('staff', []))
      await repository.addGroup(new Group('zebras', []))
      // act
      const query = new Query()
      const groups = await repository.getGroups(query)
      // assert
      assert.isNotNull(groups)
      assert.isTrue(groups.length >= 3)
      assert.isOk(groups.every((e) => e instanceof GroupModel))
      assert.isOk(groups.find((e) => e.displayName === 'admins'))
      assert.isOk(groups.find((e) => e.displayName === 'staff'))
      assert.isOk(groups.find((e) => e.displayName === 'zebras'))
    })

    it('should add and retrieve a group with members', async function () {
      this.timeout(60000)
      // arrange
      await repository.addGroup(new Group('hasmembers', [
        { value: 'user-joe', display: 'Joe Plumber' },
        { value: 'user-mike', display: 'Michael London' },
        { value: 'group-admins' },
        { value: 'user-susan', display: 'Susan Winters' }
      ]))
      // act
      const group = await repository.getGroup('hasmembers')
      // assert
      assert.instanceOf(group, GroupModel)
      assert.equal(group.displayName, 'hasmembers')
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

    it('should add and update an empty group', async function () {
      this.timeout(60000)
      // arrange
      const tGroupAdd = new Group('addupgroup', [])
      await repository.addGroup(tGroupAdd)
      // act
      const tGroupUpdate = new Group('addupgroup', [])
      const updated = await repository.updateGroup(tGroupUpdate)
      assert.instanceOf(updated, GroupModel)
      assert.equal(updated.id, 'group-addupgroup')
      const group = await repository.getGroup('addupgroup')
      // assert
      assert.instanceOf(group, GroupModel)
      assert.equal(group.displayName, 'addupgroup')
      assert.lengthOf(group.members, 0)
    })

    it('should update an existing group entity', async function () {
      this.timeout(60000)
      // arrange
      const tGroupAdd = new Group('updategroup', [
        { value: 'user-joe', display: 'Joe Plumber' }
      ])
      await repository.addGroup(tGroupAdd)
      // act
      const tGroupUpdate = new Group('updategroup', [
        { value: 'user-joe', display: 'Joe Plumber' },
        { value: 'user-susan', display: 'Susan Winters' }
      ])
      const updated = await repository.updateGroup(tGroupUpdate)
      assert.instanceOf(updated, GroupModel)
      assert.equal(updated.id, 'group-updategroup')
      const group = await repository.getGroup('updategroup')
      // assert
      assert.instanceOf(group, GroupModel)
      assert.equal(group.displayName, 'updategroup')
      assert.lengthOf(group.members, 2)
      assert.isOk(group.members.find((e) => e.value === 'user-joe'))
      assert.isOk(group.members.find((e) => e.value === 'user-susan'))
    })

    it('should ignore no-op changes to a group', async function () {
      this.timeout(60000)
      // arrange
      const usecase = PatchGroup({
        getDomainLeader: () => null,
        getDomainMembers: () => [],
        entityRepository: repository
      })
      // act
      const patch = {
        schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
        // user-joe is already a member of the group; this may happen if the
        // provider is attempting to clear up previously failed operations.
        Operations: [{
          op: 'Add',
          path: 'members',
          value: [{ value: 'user-joe' }]
        }]
      }
      const updated = await usecase('group-updategroup', patch)
      // assert
      assert.equal(updated.displayName, 'updategroup')
      assert.lengthOf(updated.members, 2)
      assert.isOk(updated.members.find((e) => e.value === 'user-joe'))
      assert.isOk(updated.members.find((e) => e.value === 'user-susan'))
    })

    it('should update a group to remove all members', async function () {
      this.timeout(60000)
      // arrange
      const tGroupAdd = new Group('lessmembers', [
        { value: 'user-joe', display: 'Joe Plumber' },
        { value: 'user-susan', display: 'Susan Winters' }
      ])
      await repository.addGroup(tGroupAdd)
      // act
      const tGroupUpdate = new Group('lessmembers', [])
      const updated = await repository.updateGroup(tGroupUpdate)
      assert.instanceOf(updated, GroupModel)
      const group = await repository.getGroup('lessmembers')
      // assert
      assert.instanceOf(group, GroupModel)
      assert.equal(group.displayName, 'lessmembers')
      assert.lengthOf(group.members, 0)
    })

    it('should remove an existing group entity', async function () {
      this.timeout(60000)
      // arrange
      const tGroup = new Group('removegroup', [])
      const added = await repository.addGroup(tGroup)
      // act
      await repository.removeGroup(added.id)
      const group = await repository.getGroup(added.id)
      await repository.removeGroup(added.id)
      // assert
      assert.isNull(group)
    })
  })

  describe('Users and Domains ', function () {
    let repository
    let p4config

    before(async function () {
      this.timeout(60000)
      p4config = await runner.startServer('./tmp/p4d/domain-repo')
      helpers.establishSuper(p4config)
      settingsRepository.clear()
      settingsRepository.set('P4PORT', p4config.port)
      settingsRepository.set('P4USER', p4config.user)
      settingsRepository.set('P4PASSWD', p4config.password)
      settingsRepository.set('P4TICKETS', p4config.tickets)
      settingsRepository.set('P4TRUST', p4config.trust)
      repository = new HelixEntityRepository({ getProvisioningServers })
    })

    after(async function () {
      this.timeout(60000)
      await runner.stopServer(p4config)
    })

    it('should add user for domain A with externalId idA', async function () {
      this.timeout(60000)
      // arrange
      const tUser = new User('adduserA', 'joe@example.com', 'Joe Q. User')
      tUser.externalId = 'idA'
      tUser.password = 'secret123'
      // act
      const added = await repository.addUser(tUser, undefined, 'A')
      // assert
      assert.instanceOf(added, UserModel)
      assert.equal(added.id, 'user-adduserA')
    })

    it('should retrieve user with appropriate externalId', async function () {
      this.timeout(60000)
      // arrange
      // act
      const domainA = await repository.getUser('adduserA', undefined, 'A')
      const domainB = await repository.getUser('adduserA', undefined, 'B')
      const domainNone = await repository.getUser('adduserA')
      // assert
      assert.instanceOf(domainA, UserModel)
      assert.equal(domainA.id, 'user-adduserA')
      assert.equal(domainA.externalId, 'idA')
      assert.equal(domainA.email, 'joe@example.com')
      assert.instanceOf(domainB, UserModel)
      assert.equal(domainB.id, 'user-adduserA')
      assert.isUndefined(domainB.externalId)
      assert.equal(domainB.email, 'joe@example.com')
      assert.instanceOf(domainNone, UserModel)
      assert.equal(domainNone.id, 'user-adduserA')
      assert.isUndefined(domainNone.externalId)
      assert.equal(domainNone.email, 'joe@example.com')
    })

    it('should update and return user with additional externalId', async function () {
      this.timeout(60000)
      // arrange
      // act
      const original = await repository.getUser('adduserA', undefined, 'B')
      original.externalId = 'idB'
      await repository.updateUser(original, undefined, 'B')
      const domainB = await repository.getUser('adduserA', undefined, 'B')
      // assert
      assert.instanceOf(domainB, UserModel)
      assert.equal(domainB.id, 'user-adduserA')
      assert.equal(domainB.externalId, 'idB')
      assert.equal(domainB.email, 'joe@example.com')
    })

    it('should retrieve all users with appropriate externalId', async function () {
      this.timeout(60000)
      // arrange
      const query = new Query()
      // act
      const alldomainA = await repository.getUsers(query, undefined, 'A')
      const alldomainB = await repository.getUsers(query, undefined, 'B')
      const domainA = alldomainA.filter((e) => e.userName !== 'bruno')
      const domainB = alldomainB.filter((e) => e.userName !== 'bruno')
      // assert
      assert.lengthOf(domainA, 1)
      assert.lengthOf(domainB, 1)
      assert.equal(domainA[0].id, 'user-adduserA')
      assert.equal(domainA[0].externalId, 'idA')
      assert.equal(domainA[0].email, 'joe@example.com')
      assert.equal(domainB[0].id, 'user-adduserA')
      assert.equal(domainB[0].externalId, 'idB')
      assert.equal(domainB[0].email, 'joe@example.com')
    })

    it('should remove externalId for specific domain', async function () {
      this.timeout(60000)
      // arrange
      // act
      const original = await repository.getUser('adduserA', undefined, 'B')
      original.externalId = undefined
      await repository.updateUser(original, undefined, 'B')
      const domainB = await repository.getUser('adduserA', undefined, 'B')
      // assert
      assert.instanceOf(domainB, UserModel)
      assert.equal(domainB.id, 'user-adduserA')
      assert.isUndefined(domainB.externalId)
      assert.equal(domainB.email, 'joe@example.com')
    })

    it('should retrieve user externalId for domain A', async function () {
      this.timeout(60000)
      // arrange
      // act
      const domainA = await repository.getUser('adduserA', undefined, 'A')
      // assert
      assert.instanceOf(domainA, UserModel)
      assert.equal(domainA.id, 'user-adduserA')
      assert.equal(domainA.externalId, 'idA')
      assert.equal(domainA.email, 'joe@example.com')
    })

    it('should add and retrieve group with externalId', async function () {
      this.timeout(60000)
      // arrange
      const tGroup = new Group('domgroup', [])
      tGroup.externalId = 'Group-123'
      const added = await repository.addGroup(tGroup, undefined, 'canine')
      assert.instanceOf(added, GroupModel)
      assert.equal(added.id, 'group-domgroup')
      assert.equal(added.externalId, 'Group-123')
      // act
      const groupById = await repository.getGroup(added.id, undefined, 'canine')
      // assert
      assert.instanceOf(groupById, GroupModel)
      assert.equal(groupById.id, 'group-domgroup')
      assert.equal(groupById.displayName, 'domgroup')
      assert.lengthOf(groupById.members, 0)
      assert.equal(groupById.externalId, 'Group-123')

      // retrieve by the plain p4d group name
      const group = await repository.getGroup('domgroup', undefined, 'canine')
      assert.instanceOf(group, GroupModel)
      assert.equal(group.displayName, 'domgroup')
      assert.lengthOf(group.members, 0)
      assert.equal(group.externalId, 'Group-123')

      // get all groups by domain
      const query = new Query()
      const groups = await repository.getGroups(query, undefined, 'canine')
      assert.isNotNull(groups)
      const domgroup = groups.find((e) => e.displayName === 'domgroup')
      assert.equal(domgroup.externalId, 'Group-123')
    })

    it('should update group with externalId', async function () {
      this.timeout(60000)
      // arrange
      // act
      const tGroupUpdate = new Group('domgroup', [])
      tGroupUpdate.externalId = 'NewGroup456'
      const updated = await repository.updateGroup(tGroupUpdate, undefined, 'canine')
      assert.instanceOf(updated, GroupModel)
      assert.equal(updated.id, 'group-domgroup')
      assert.equal(updated.externalId, 'NewGroup456')
      const group = await repository.getGroup('domgroup', undefined, 'canine')
      // assert
      assert.instanceOf(group, GroupModel)
      assert.equal(group.displayName, 'domgroup')
      assert.equal(group.externalId, 'NewGroup456')
    })
  })

  describe('Missing P4PASSWD', function () {
    let repository
    let p4config

    before(async function () {
      this.timeout(60000)
      p4config = await runner.startSslServer('./tmp/p4d/ssl-passwd')
      settingsRepository.clear()
      settingsRepository.set('P4PORT', p4config.port)
      settingsRepository.set('P4USER', p4config.user)
      settingsRepository.set('P4TICKETS', p4config.tickets)
      settingsRepository.set('P4TRUST', p4config.trust)
      repository = new HelixEntityRepository({ getProvisioningServers })
    })

    after(async function () {
      this.timeout(60000)
      helpers.establishTrust(p4config)
      await runner.stopServer(p4config)
    })

    it('should report error for missing P4PASSWD', async function () {
      this.timeout(60000)
      const query = new Query()
      try {
        await repository.getUsers(query)
        assert.fail('should have raised Error')
      } catch (err) {
        assert.equal(err.message, 'server p4passwd not specified')
      }
    })
  })

  describe('SSL without trust, should establish', function () {
    let repository
    let p4config

    before(async function () {
      this.timeout(60000)
      p4config = await runner.startSslServer('./tmp/p4d/ssl-untrust')
      settingsRepository.clear()
      settingsRepository.set('P4PORT', p4config.port)
      settingsRepository.set('P4USER', p4config.user)
      settingsRepository.set('P4PASSWD', p4config.password)
      settingsRepository.set('P4TICKETS', p4config.tickets)
      settingsRepository.set('P4TRUST', p4config.trust)
      repository = new HelixEntityRepository({ getProvisioningServers })
    })

    after(async function () {
      this.timeout(60000)
      helpers.establishTrust(p4config)
      await runner.stopServer(p4config)
    })

    it('should report untrusted connection', async function () {
      this.timeout(60000)
      const query = new Query()
      try {
        await repository.getUsers(query)
      } catch (err) {
        assert.include(err.message, 'User bruno doesn\'t exist')
      }
    })
  })

  describe('SSL trusted', function () {
    let repository
    let p4config

    before(async function () {
      this.timeout(60000)
      p4config = await runner.startSslServer('./tmp/p4d/ssl-trust')
      helpers.establishTrust(p4config)
      helpers.establishSuper(p4config)
      settingsRepository.clear()
      settingsRepository.set('P4PORT', p4config.port)
      settingsRepository.set('P4USER', p4config.user)
      settingsRepository.set('P4PASSWD', p4config.password)
      settingsRepository.set('P4TICKETS', p4config.tickets)
      settingsRepository.set('P4TRUST', p4config.trust)
      repository = new HelixEntityRepository({ getProvisioningServers })
    })

    after(async function () {
      this.timeout(60000)
      await runner.stopServer(p4config)
    })

    it('should return null for missing user entity', async function () {
      this.timeout(60000)
      // act
      const user = await repository.getUser('foobar')
      // assert
      assert.isNull(user)
    })

    it('should add and retrieve a single user entity', async function () {
      this.timeout(60000)
      // arrange
      const tUser = new User('adduser', 'joe@example.com', 'Joe Q. User')
      tUser.password = 'secret123'
      const added = await repository.addUser(tUser)
      assert.instanceOf(added, UserModel)
      assert.equal(added.id, 'user-adduser')
      // act
      const userById = await repository.getUser(added.id)
      // assert
      assert.instanceOf(userById, UserModel)
      assert.equal(userById.id, 'user-adduser')
      assert.equal(userById.username, 'adduser')
      assert.equal(userById.email, 'joe@example.com')
      assert.equal(userById.fullname, 'Joe Q. User')
      // retrieve by the plain p4d user name
      const userByName = await repository.getUser(userById.username)
      assert.instanceOf(userByName, UserModel)
      assert.equal(userByName.username, 'adduser')
      assert.equal(userByName.email, 'joe@example.com')
      assert.equal(userByName.fullname, 'Joe Q. User')
    })
  })

  describe('PatchGroup operations', function () {
    let repository
    let p4config

    before(async function () {
      this.timeout(60000)
      p4config = await runner.startServer('./tmp/p4d/patch-group')
      helpers.establishSuper(p4config)
      settingsRepository.clear()
      settingsRepository.set('P4PORT', p4config.port)
      settingsRepository.set('P4USER', p4config.user)
      settingsRepository.set('P4PASSWD', p4config.password)
      settingsRepository.set('P4TICKETS', p4config.tickets)
      settingsRepository.set('P4TRUST', p4config.trust)
      repository = new HelixEntityRepository({ getProvisioningServers })
    })

    after(async function () {
      this.timeout(60000)
      await runner.stopServer(p4config)
    })

    it('should create a new empty group using AddGroup', async function () {
      this.timeout(60000)
      // arrange
      const usecase = AddGroup({
        getDomainLeader: () => null,
        getDomainMembers: () => [],
        entityRepository: repository
      })
      // act
      const incoming = new Group('group-patchgroup', [])
      const updated = await usecase(incoming)
      // assert
      assert.equal(updated.displayName, 'patchgroup')
      assert.lengthOf(updated.members, 0)
      const actual = await repository.getGroup('patchgroup')
      assert.equal(actual.displayName, 'patchgroup')
      assert.lengthOf(actual.members, 0)
    })

    it('should ignore malformed group keys in PatchGroup', async function () {
      // earlier version of auth service was updated and the old group key
      // caused a problem (group keys were merely numbers but later became JSON
      // blobs) when an update was performed on that group
      this.timeout(60000)
      // arrange
      const p4 = new P4({
        P4PORT: p4config.port,
        P4USER: p4config.user,
        P4TICKETS: p4config.tickets,
        P4TRUST: p4config.trust
      })
      const keysetCmd = await p4.cmd('key scim-group-mynewgroup 1')
      assert.equal(keysetCmd.stat[0].code, 'stat')
      const usecase = PatchGroup({
        getDomainLeader: () => null,
        getDomainMembers: () => [],
        entityRepository: repository
      })
      // act
      const patch = {
        schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
        Operations: [{
          op: 'Add',
          path: 'externalId',
          value: '47615e53-3ec0-44d9-aabb-ebb1e2c73b28'
        }]
      }
      const updated = await usecase('group-mynewgroup', patch)
      // assert
      assert.equal(updated.displayName, 'mynewgroup')
      assert.lengthOf(updated.members, 0)
      const actual = await repository.getGroup('mynewgroup')
      assert.equal(actual.displayName, 'mynewgroup')
      assert.lengthOf(actual.members, 0)
    })

    it('should add a member to the group', async function () {
      this.timeout(60000)
      // arrange
      const usecase = PatchGroup({
        getDomainLeader: () => null,
        getDomainMembers: () => [],
        entityRepository: repository
      })
      // act
      const patch = {
        schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
        Operations: [{
          op: 'Add',
          path: 'members',
          value: [{ value: 'user-joe' }]
        }]
      }
      const updated = await usecase('group-patchgroup', patch)
      // assert
      assert.equal(updated.displayName, 'patchgroup')
      assert.lengthOf(updated.members, 1)
      assert.isOk(updated.members[0].value === 'user-joe')
      assert.isTrue(updated.changed)
      const actual = await repository.getGroup('patchgroup')
      assert.equal(actual.displayName, 'patchgroup')
      assert.lengthOf(actual.members, 1)
      assert.isOk(actual.members[0].value === 'user-joe')
    })

    it('should add a second member to the group', async function () {
      this.timeout(60000)
      // arrange
      const usecase = PatchGroup({
        getDomainLeader: () => null,
        getDomainMembers: () => [],
        entityRepository: repository
      })
      // act
      const patch = {
        schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
        Operations: [{
          op: 'Add',
          path: 'members',
          value: [{ value: 'user-susan' }]
        }]
      }
      const updated = await usecase('group-patchgroup', patch)
      // assert
      assert.equal(updated.displayName, 'patchgroup')
      assert.lengthOf(updated.members, 2)
      assert.isOk(updated.members.find((e) => e.value === 'user-joe'))
      assert.isOk(updated.members.find((e) => e.value === 'user-susan'))
      assert.isTrue(updated.changed)
      const actual = await repository.getGroup('patchgroup')
      assert.equal(actual.displayName, 'patchgroup')
      assert.lengthOf(actual.members, 2)
      assert.isOk(actual.members.find((e) => e.value === 'user-joe'))
      assert.isOk(actual.members.find((e) => e.value === 'user-susan'))
    })

    it('should ignore no-op changes to a group', async function () {
      this.timeout(60000)
      // arrange
      const usecase = PatchGroup({
        getDomainLeader: () => null,
        getDomainMembers: () => [],
        entityRepository: repository
      })
      // act
      const patch = {
        schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
        // user-joe is already a member of the group; this may happen if the
        // provider is attempting to clear up previously failed operations.
        Operations: [{
          op: 'Add',
          path: 'members',
          value: [{ value: 'user-joe' }]
        }]
      }
      const updated = await usecase('group-patchgroup', patch)
      // assert
      assert.equal(updated.displayName, 'patchgroup')
      assert.lengthOf(updated.members, 2)
      assert.isOk(updated.members.find((e) => e.value === 'user-joe'))
      assert.isOk(updated.members.find((e) => e.value === 'user-susan'))
      assert.isUndefined(updated.changed)
      const actual = await repository.getGroup('patchgroup')
      assert.equal(actual.displayName, 'patchgroup')
      assert.lengthOf(actual.members, 2)
      assert.isOk(actual.members.find((e) => e.value === 'user-joe'))
      assert.isOk(actual.members.find((e) => e.value === 'user-susan'))
    })

    it('should remove a member from a group', async function () {
      this.timeout(60000)
      // arrange
      const usecase = PatchGroup({
        getDomainLeader: () => null,
        getDomainMembers: () => [],
        entityRepository: repository
      })
      // act
      //
      // Microsoft Azure sends this format, but it is wrong (see RFC 7644 3.5.2.2)
      // and the scim-patch module does not recognize this peculiar invention.
      //
      // const patch = {
      //   schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
      //   Operations: [{
      //     op: 'Remove',
      //     path: 'members',
      //     value: [{ value: 'user-joe' }]
      //   }]
      // }
      //
      // This is the correct format for removing group members.
      //
      const patch = {
        schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
        Operations: [{
          op: 'Remove',
          path: 'members[value eq "user-joe"]'
        }]
      }
      const updated = await usecase('group-patchgroup', patch)
      // assert
      assert.equal(updated.displayName, 'patchgroup')
      assert.lengthOf(updated.members, 1)
      assert.isUndefined(updated.members.find((e) => e.value === 'user-joe'))
      assert.isOk(updated.members.find((e) => e.value === 'user-susan'))
      assert.isTrue(updated.changed)
      const actual = await repository.getGroup('patchgroup')
      assert.equal(actual.displayName, 'patchgroup')
      assert.lengthOf(actual.members, 1)
      assert.isUndefined(updated.members.find((e) => e.value === 'user-joe'))
      assert.isOk(updated.members.find((e) => e.value === 'user-susan'))
    })
  })
})
