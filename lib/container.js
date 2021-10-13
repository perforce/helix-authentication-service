//
// Copyright 2020-2021 Perforce Software
//
const awilix = require('awilix')

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

/* global include */
const ReceiveUserProfile = include('lib/features/login/domain/usecases/ReceiveUserProfile')
const FindRequest = include('lib/features/login/domain/usecases/FindRequest')
const FindUserProfile = include('lib/features/login/domain/usecases/FindUserProfile')
const GetUserById = include('lib/features/login/domain/usecases/GetUserById')
const StartRequest = include('lib/features/login/domain/usecases/StartRequest')
const SettingsRepository = include('lib/common/data/repositories/EnvSettingsRepository')
const AddUser = include('lib/features/scim/domain/usecases/AddUser')
const UpdateUser = include('lib/features/scim/domain/usecases/UpdateUser')
const GetUser = include('lib/features/scim/domain/usecases/GetUser')
const GetUsers = include('lib/features/scim/domain/usecases/GetUsers')
const PatchUser = include('lib/features/scim/domain/usecases/PatchUser')
const RemoveUser = include('lib/features/scim/domain/usecases/RemoveUser')
const AddGroup = include('lib/features/scim/domain/usecases/AddGroup')
const GetGroup = include('lib/features/scim/domain/usecases/GetGroup')
const GetGroups = include('lib/features/scim/domain/usecases/GetGroups')
const PatchGroup = include('lib/features/scim/domain/usecases/PatchGroup')
const UpdateGroup = include('lib/features/scim/domain/usecases/UpdateGroup')
const RemoveGroup = include('lib/features/scim/domain/usecases/RemoveGroup')
const logger = include('lib/logging')

let RequestRepository = null
let UserRepository = null
if (process.env.REDIS_URL) {
  logger.debug('container: registering redis repositories')
  RequestRepository = include('lib/features/login/data/repositories/RedisRequestRepository')
  UserRepository = include('lib/features/login/data/repositories/RedisUserRepository')
} else {
  logger.debug('container: registering in-memory repositories')
  RequestRepository = include('lib/features/login/data/repositories/InMemoryRequestRepository')
  UserRepository = include('lib/features/login/data/repositories/InMemoryUserRepository')
}
let EntityRepository = null
if (process.env.P4PORT) {
  logger.debug('container: registering p4d repositories')
  EntityRepository = include('lib/features/scim/data/repositories/HelixEntityRepository')
} else {
  logger.debug('container: registering in-memory repositories')
  EntityRepository = include('lib/features/scim/data/repositories/InMemoryEntityRepository')
}

// create the injection container
const container = awilix.createContainer({
  injectionMode: awilix.InjectionMode.PROXY
})

container.register({
  // register the data repositories as classes
  entityRepository: awilix.asClass(EntityRepository),
  requestRepository: awilix.asClass(RequestRepository),
  settingsRepository: awilix.asClass(SettingsRepository),
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
  serviceCert: awilix.asFunction(() => process.env.SP_CERT_FILE || 'certs/server.crt'),
  serviceKey: awilix.asFunction(() => process.env.SP_KEY_FILE || 'certs/server.key')
})

module.exports = container
