//
// Copyright 2020-2022 Perforce Software
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

import IsClientAuthorized from 'helix-auth-svc/lib/common/domain/usecases/IsClientAuthorized.js'
import LoadAuthorityCerts from 'helix-auth-svc/lib/common/domain/usecases/LoadAuthorityCerts.js'
import RefreshEnvironment from 'helix-auth-svc/lib/common/domain/usecases/RefreshEnvironment.js'
import { DummyRedisConnector } from 'helix-auth-svc/lib/features/login/data/connectors/DummyRedisConnector.js'
import { DotenvRepository } from 'helix-auth-svc/lib/features/admin/data/repositories/DotenvRepository.js'
import { EnvCredentialsRepository } from 'helix-auth-svc/lib/features/admin/data/repositories/EnvCredentialsRepository.js'
import { HelixCredentialsRepository } from 'helix-auth-svc/lib/features/admin/data/repositories/HelixCredentialsRepository.js'
import { InMemoryTokenRepository } from 'helix-auth-svc/lib/features/admin/data/repositories/InMemoryTokenRepository.js'
import DeleteWebToken from 'helix-auth-svc/lib/features/admin/domain/usecases/DeleteWebToken.js'
import ReadConfiguration from 'helix-auth-svc/lib/features/admin/domain/usecases/ReadConfiguration.js'
import RegisterWebToken from 'helix-auth-svc/lib/features/admin/domain/usecases/RegisterWebToken.js'
import ValidateCredentials from 'helix-auth-svc/lib/features/admin/domain/usecases/ValidateCredentials.js'
import VerifyWebToken from 'helix-auth-svc/lib/features/admin/domain/usecases/VerifyWebToken.js'
import WriteConfiguration from 'helix-auth-svc/lib/features/admin/domain/usecases/WriteConfiguration.js'
import RedisSentinel from 'helix-auth-svc/lib/features/login/data/connectors/RedisSentinel.js'
import { RedisConnector } from 'helix-auth-svc/lib/features/login/data/connectors/RedisConnector.js'
import { RedisRequestRepository } from 'helix-auth-svc/lib/features/login/data/repositories/RedisRequestRepository.js'
import { RedisUserRepository } from 'helix-auth-svc/lib/features/login/data/repositories/RedisUserRepository.js'
import { InMemoryRequestRepository } from 'helix-auth-svc/lib/features/login/data/repositories/InMemoryRequestRepository.js'
import { InMemoryUserRepository } from 'helix-auth-svc/lib/features/login/data/repositories/InMemoryUserRepository.js'
import { HelixEntityRepository } from 'helix-auth-svc/lib/features/scim/data/repositories/HelixEntityRepository.js'
import { InMemoryEntityRepository } from 'helix-auth-svc/lib/features/scim/data/repositories/InMemoryEntityRepository.js'
import AssignNameIdentifier from 'helix-auth-svc/lib/features/login/domain/usecases/AssignNameIdentifier.js'
import FetchSamlMetadata from 'helix-auth-svc/lib/features/login/domain/usecases/FetchSamlMetadata.js'
import GenerateLoginUrl from 'helix-auth-svc/lib/features/login/domain/usecases/GenerateLoginUrl.js'
import GenerateSamlResponse from 'helix-auth-svc/lib/features/login/domain/usecases/GenerateSamlResponse.js'
import GetAuthProviders from 'helix-auth-svc/lib/features/login/domain/usecases/GetAuthProviders.js'
import GetSamlAuthnContext from 'helix-auth-svc/lib/features/login/domain/usecases/GetSamlAuthnContext.js'
import GetSamlConfiguration from 'helix-auth-svc/lib/features/login/domain/usecases/GetSamlConfiguration.js'
import ReceiveUserProfile from 'helix-auth-svc/lib/features/login/domain/usecases/ReceiveUserProfile.js'
import FindRequest from 'helix-auth-svc/lib/features/login/domain/usecases/FindRequest.js'
import FindUserProfile from 'helix-auth-svc/lib/features/login/domain/usecases/FindUserProfile.js'
import GetIdPConfiguration from 'helix-auth-svc/lib/features/login/domain/usecases/GetIdPConfiguration.js'
import StartRequest from 'helix-auth-svc/lib/features/login/domain/usecases/StartRequest.js'
import ValidateSamlRequest from 'helix-auth-svc/lib/features/login/domain/usecases/ValidateSamlRequest.js'
import ValidateSamlResponse from 'helix-auth-svc/lib/features/login/domain/usecases/ValidateSamlResponse.js'
import ValidateWebToken from 'helix-auth-svc/lib/features/login/domain/usecases/ValidateWebToken.js'
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

// create the injection container
const container = awilix.createContainer({
  injectionMode: awilix.InjectionMode.PROXY
})

container.register({
  // register the data repositories as classes
  configRepository: awilix.asClass(DotenvRepository),
  settingsRepository: awilix.asClass(EnvSettingsRepository),
  tokenRepository: awilix.asClass(InMemoryTokenRepository),

  // register the use cases as functions
  addGroup: awilix.asFunction(AddGroup),
  addUser: awilix.asFunction(AddUser),
  assignNameIdentifier: awilix.asFunction(AssignNameIdentifier),
  deleteWebToken: awilix.asFunction(DeleteWebToken),
  fetchSamlMetadata: awilix.asFunction(FetchSamlMetadata),
  findRequest: awilix.asFunction(FindRequest),
  findUserProfile: awilix.asFunction(FindUserProfile),
  generateLoginUrl: awilix.asFunction(GenerateLoginUrl),
  generateSamlResponse: awilix.asFunction(GenerateSamlResponse),
  getGroup: awilix.asFunction(GetGroup),
  getGroups: awilix.asFunction(GetGroups),
  getIdPConfiguration: awilix.asFunction(GetIdPConfiguration),
  getAuthProviders: awilix.asFunction(GetAuthProviders),
  getSamlAuthnContext: awilix.asFunction(GetSamlAuthnContext),
  getSamlConfiguration: awilix.asFunction(GetSamlConfiguration),
  getUser: awilix.asFunction(GetUser),
  getUsers: awilix.asFunction(GetUsers),
  isClientAuthorized: awilix.asFunction(IsClientAuthorized),
  loadAuthorityCerts: awilix.asFunction(LoadAuthorityCerts),
  patchGroup: awilix.asFunction(PatchGroup),
  patchUser: awilix.asFunction(PatchUser),
  readConfiguration: awilix.asFunction(ReadConfiguration),
  receiveUserProfile: awilix.asFunction(ReceiveUserProfile),
  refreshEnvironment: awilix.asFunction(RefreshEnvironment),
  registerWebToken: awilix.asFunction(RegisterWebToken),
  removeGroup: awilix.asFunction(RemoveGroup),
  removeUser: awilix.asFunction(RemoveUser),
  startRequest: awilix.asFunction(StartRequest),
  updateGroup: awilix.asFunction(UpdateGroup),
  updateUser: awilix.asFunction(UpdateUser),
  validateCredentials: awilix.asFunction(ValidateCredentials),
  validateSamlRequest: awilix.asFunction(ValidateSamlRequest),
  validateSamlResponse: awilix.asFunction(ValidateSamlResponse),
  validateWebToken: awilix.asFunction(ValidateWebToken),
  verifyWebToken: awilix.asFunction(VerifyWebToken),
  writeConfiguration: awilix.asFunction(WriteConfiguration),

  // register singletons as values
  logger: awilix.asValue(logger),

  // register default values used in multiple modules
  adminUsername: awilix.asFunction(() => process.env.ADMIN_USERNAME || 'perforce'),
  adminPassfile: awilix.asFunction(() => process.env.ADMIN_PASSWD_FILE || null),
  dotenvFile: awilix.asFunction(() => process.env.NODE_ENV === 'automated_tests' ? 'test/test-dot.env' : '.env'),
  serviceCert: awilix.asFunction(() => process.env.CERT_FILE || process.env.SP_CERT_FILE || 'certs/server.crt'),
  serviceKey: awilix.asFunction(() => process.env.KEY_FILE || process.env.SP_KEY_FILE || 'certs/server.key'),
  redisCert: awilix.asFunction(() => process.env.REDIS_CERT_FILE || process.env.CERT_FILE || 'certs/server.crt'),
  redisKey: awilix.asFunction(() => process.env.REDIS_KEY_FILE || process.env.KEY_FILE || 'certs/server.key'),
  cacheTtl: awilix.asFunction(() => parseInt(process.env.CACHE_TTL || '300', 10) * 1000),
  tokenTtl: awilix.asFunction(() => parseInt(process.env.TOKEN_TTL || '3600', 10) * 1000)
})

export function registerLateBindings () {
  let CredentialsRepository = null
  if (process.env.P4PORT && process.env.ADMIN_P4_AUTH) {
    logger.debug('container: using Helix admin authentication')
    CredentialsRepository = HelixCredentialsRepository
  } else {
    logger.debug('container: using .env admin authentication')
    CredentialsRepository = EnvCredentialsRepository
  }
  let RequestRepository = null
  let UserRepository = null
  let KeyValueConnector = null
  if (process.env.REDIS_URL || process.env.SENTINEL_CONFIG_FILE) {
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
  container.register({
    // register the data repositories as classes
    credentialsRepository: awilix.asClass(CredentialsRepository),

    // register the data connectors as classes
    redisSentinel: awilix.asValue(RedisSentinel),
    redisConnector: awilix.asClass(KeyValueConnector),

    // register the data repositories as classes
    entityRepository: awilix.asClass(EntityRepository),
    requestRepository: awilix.asClass(RequestRepository),
    userRepository: awilix.asClass(UserRepository)
  })
}
registerLateBindings()

export default container
