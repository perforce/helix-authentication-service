//
// Copyright 2020-2021 Perforce Software
//
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as awilix from 'awilix'
import glob from 'glob'

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

import { DummyRedisConnector } from 'helix-auth-svc/lib/features/login/data/connectors/DummyRedisConnector.js'
import { RedisConnector } from 'helix-auth-svc/lib/features/login/data/connectors/RedisConnector.js'
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
let KeyValueConnector = null
if (process.env.REDIS_URL) {
  logger.debug('container: registering redis-login repositories')
  RequestRepository = RedisRequestRepository
  UserRepository = RedisUserRepository
  KeyValueConnector = RedisConnector
} else {
  logger.debug('container: registering in-memory-login repositories')
  RequestRepository = InMemoryRequestRepository
  UserRepository = InMemoryUserRepository
  KeyValueConnector = DummyRedisConnector
}
let EntityRepository = null
if (process.env.P4PORT) {
  logger.debug('container: registering p4d-helix repositories')
  EntityRepository = HelixEntityRepository
} else {
  logger.debug('container: registering in-memory-helix repositories')
  EntityRepository = InMemoryEntityRepository
}

// create the injection container
const container = awilix.createContainer({
  injectionMode: awilix.InjectionMode.PROXY
})

container.register({
  // register the data connectors as classes
  redisConnector: awilix.asClass(KeyValueConnector),

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

  // helper functions
  loadAuthorityCerts: awilix.asFunction(loadAuthorityCerts),

  // register singletons as values
  logger: awilix.asValue(logger),

  // register default values used in multiple modules
  serviceCert: awilix.asFunction(() => process.env.CERT_FILE || process.env.SP_CERT_FILE || 'certs/server.crt'),
  serviceKey: awilix.asFunction(() => process.env.KEY_FILE || process.env.SP_KEY_FILE || 'certs/server.key'),
  redisCert: awilix.asFunction(() => process.env.REDIS_CERT_FILE || process.env.CERT_FILE || 'certs/server.crt'),
  redisKey: awilix.asFunction(() => process.env.REDIS_KEY_FILE || process.env.KEY_FILE || 'certs/server.key'),
  cacheTtl: awilix.asFunction(() => parseInt(process.env.CACHE_TTL || '300', 10) * 1000)
})

export function loadAuthorityCerts ({ settingsRepository }) {
  return () => {
    let files = []
    // Use node-glob to optionally load multiple CA certificate files.
    // c.f. https://github.com/isaacs/node-glob
    const cacertfile = settingsRepository.get('CA_CERT_FILE')
    if (cacertfile) {
      files = files.concat(glob.sync(cacertfile))
    }
    const cacertpath = settingsRepository.get('CA_CERT_PATH')
    if (cacertpath) {
      const names = fs.readdirSync(cacertpath)
      const paths = names.map(f => {
        return path.join(cacertpath, f)
      })
      files = files.concat(paths)
    }
    if (files.length > 0) {
      const results = files.map(f => {
        const stats = fs.statSync(f)
        if (stats.isFile()) {
          logger.debug('reading CA file %s', f)
          return fs.readFileSync(f)
        }
        return null
      })
      return results.filter((v) => v !== null)
    }
    return undefined
  }
}

export default container
