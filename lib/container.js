//
// Copyright 2020-2021 Perforce Software
//
import * as awilix from 'awilix'

//
// Use dependency injection (inversion of control) to register many of the
// things that our application will need. Especially helpful for separating
// concerns to make unit testing feasible.
//
// awilix is particularly nice in that it always passes the registered values as
// an object to the registered constructors/functions. The functions then use
// destructuring to extract the desired values. For instance, the FindRequest
// use case expects a valued named 'requestRepository', which is registered in
// the cradle with exactly that name.
//

import { RedisRequestRepository } from 'helix-auth-svc/lib/features/login/data/repositories/RedisRequestRepository.js'
import { RedisUserRepository } from 'helix-auth-svc/lib/features/login/data/repositories/RedisUserRepository.js'
import { InMemoryRequestRepository } from 'helix-auth-svc/lib/features/login/data/repositories/InMemoryRequestRepository.js'
import { InMemoryUserRepository } from 'helix-auth-svc/lib/features/login/data/repositories/InMemoryUserRepository.js'
import { HelixEntityRepository } from 'helix-auth-svc/lib/features/scim/data/repositories/HelixEntityRepository.js'
import { InMemoryEntityRepository } from 'helix-auth-svc/lib/features/scim/data/repositories/InMemoryEntityRepository.js'
import ReceiveUserProfile from 'helix-auth-svc/lib/features/login/domain/usecases/ReceiveUserProfile.js'
import FindRequest from 'helix-auth-svc/lib/features/login/domain/usecases/FindRequest.js'
import FindUserProfile from 'helix-auth-svc/lib/features/login/domain/usecases/FindUserProfile.js'
import GetUserById from 'helix-auth-svc/lib/features/login/domain/usecases/GetUserById.js'
import StartRequest from 'helix-auth-svc/lib/features/login/domain/usecases/StartRequest.js'
import { EnvSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/EnvSettingsRepository.js'
import AddUser from 'helix-auth-svc/lib/features/scim/domain/usecases/AddUser.js'
import UpdateUser from 'helix-auth-svc/lib/features/scim/domain/usecases/UpdateUser.js'
import GetUser from 'helix-auth-svc/lib/features/scim/domain/usecases/GetUser.js'
import GetUsers from 'helix-auth-svc/lib/features/scim/domain/usecases/GetUsers.js'
import PatchUser from 'helix-auth-svc/lib/features/scim/domain/usecases/PatchUser.js'
import RemoveUser from 'helix-auth-svc/lib/features/scim/domain/usecases/RemoveUser.js'
import AddGroup from 'helix-auth-svc/lib/features/scim/domain/usecases/AddGroup.js'
import GetGroup from 'helix-auth-svc/lib/features/scim/domain/usecases/GetGroup.js'
import GetGroups from 'helix-auth-svc/lib/features/scim/domain/usecases/GetGroups.js'
import PatchGroup from 'helix-auth-svc/lib/features/scim/domain/usecases/PatchGroup.js'
import UpdateGroup from 'helix-auth-svc/lib/features/scim/domain/usecases/UpdateGroup.js'
import RemoveGroup from 'helix-auth-svc/lib/features/scim/domain/usecases/RemoveGroup.js'
import logger from 'helix-auth-svc/lib/logging.js'

let RequestRepository = null
let UserRepository = null
if (process.env.REDIS_URL) {
  logger.debug('container: registering redis repositories')
  RequestRepository = RedisRequestRepository
  UserRepository = RedisUserRepository
} else {
  logger.debug('container: registering in-memory repositories')
  RequestRepository = InMemoryRequestRepository
  UserRepository = InMemoryUserRepository
}
let EntityRepository = null
if (process.env.P4PORT) {
  logger.debug('container: registering p4d repositories')
  EntityRepository = HelixEntityRepository
} else {
  logger.debug('container: registering in-memory repositories')
  EntityRepository = InMemoryEntityRepository
}

// create the injection container
const container = awilix.createContainer({
  injectionMode: awilix.InjectionMode.PROXY
})

container.register({
  // register the data repositories as classes
  entityRepository: awilix.asClass(EntityRepository),
  requestRepository: awilix.asClass(RequestRepository),
  settingsRepository: awilix.asClass(EnvSettingsRepository),
  userRepository: awilix.asClass(UserRepository),

  // register the use cases as functions
  addGroup: awilix.asFunction(AddGroup),
  addUser: awilix.asFunction(AddUser),
  findRequest: awilix.asFunction(FindRequest),
  findUserProfile: awilix.asFunction(FindUserProfile),
  getGroup: awilix.asFunction(GetGroup),
  getGroups: awilix.asFunction(GetGroups),
  getUser: awilix.asFunction(GetUser),
  getUserById: awilix.asFunction(GetUserById),
  getUsers: awilix.asFunction(GetUsers),
  patchGroup: awilix.asFunction(PatchGroup),
  patchUser: awilix.asFunction(PatchUser),
  receiveUserProfile: awilix.asFunction(ReceiveUserProfile),
  removeGroup: awilix.asFunction(RemoveGroup),
  removeUser: awilix.asFunction(RemoveUser),
  startRequest: awilix.asFunction(StartRequest),
  updateGroup: awilix.asFunction(UpdateGroup),
  updateUser: awilix.asFunction(UpdateUser),

  // register singletons as values
  logger: awilix.asValue(logger),

  // register default values used in multiple modules
  serviceCert: awilix.asFunction(() => process.env.CERT_FILE || process.env.SP_CERT_FILE || 'certs/server.crt'),
  serviceKey: awilix.asFunction(() => process.env.KEY_FILE || process.env.SP_KEY_FILE || 'certs/server.key')
})

export default container
