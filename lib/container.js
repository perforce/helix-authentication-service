//
// Copyright 2023 Perforce Software
//
import {
  asClass,
  asFunction,
  asValue,
  createContainer,
  InjectionMode,
  Lifetime
} from 'awilix'

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

import { DefaultsEnvRepository } from 'helix-auth-svc/lib/common/data/repositories/DefaultsEnvRepository.js'
import { EnvSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/EnvSettingsRepository.js'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'
import { MergedSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MergedSettingsRepository.js'
import ConstructLogger from 'helix-auth-svc/lib/common/domain/usecases/ConstructLogger.js'
import IsClientAuthorized from 'helix-auth-svc/lib/common/domain/usecases/IsClientAuthorized.js'
import LoadAuthorityCerts from 'helix-auth-svc/lib/common/domain/usecases/LoadAuthorityCerts.js'
import LoadEnvironment from 'helix-auth-svc/lib/common/domain/usecases/LoadEnvironment.js'
import { DotenvRepository } from 'helix-auth-svc/lib/features/admin/data/repositories/DotenvRepository.js'
import { EnvCredentialsRepository } from 'helix-auth-svc/lib/features/admin/data/repositories/EnvCredentialsRepository.js'
import { HelixCredentialsRepository } from 'helix-auth-svc/lib/features/admin/data/repositories/HelixCredentialsRepository.js'
import { InMemoryTokenRepository } from 'helix-auth-svc/lib/features/admin/data/repositories/InMemoryTokenRepository.js'
import AddAuthProvider from 'helix-auth-svc/lib/features/admin/domain/usecases/AddAuthProvider.js'
import ConvertFromProviders from 'helix-auth-svc/lib/features/admin/domain/usecases/ConvertFromProviders.js'
import DeleteAuthProvider from 'helix-auth-svc/lib/features/admin/domain/usecases/DeleteAuthProvider.js'
import DeleteWebToken from 'helix-auth-svc/lib/features/admin/domain/usecases/DeleteWebToken.js'
import FormatAuthProviders from 'helix-auth-svc/lib/features/admin/domain/usecases/FormatAuthProviders.js'
import ReadConfiguration from 'helix-auth-svc/lib/features/admin/domain/usecases/ReadConfiguration.js'
import RegisterWebToken from 'helix-auth-svc/lib/features/admin/domain/usecases/RegisterWebToken.js'
import ValidateAuthProvider from 'helix-auth-svc/lib/features/admin/domain/usecases/ValidateAuthProvider.js'
import ValidateCredentials from 'helix-auth-svc/lib/features/admin/domain/usecases/ValidateCredentials.js'
import VerifyWebToken from 'helix-auth-svc/lib/features/admin/domain/usecases/VerifyWebToken.js'
import WriteConfiguration from 'helix-auth-svc/lib/features/admin/domain/usecases/WriteConfiguration.js'
import { DummyRedisConnector } from 'helix-auth-svc/lib/features/login/data/connectors/DummyRedisConnector.js'
import RedisSentinel from 'helix-auth-svc/lib/features/login/data/connectors/RedisSentinel.js'
import { RedisConnector } from 'helix-auth-svc/lib/features/login/data/connectors/RedisConnector.js'
import { RedisRequestRepository } from 'helix-auth-svc/lib/features/login/data/repositories/RedisRequestRepository.js'
import { RedisUserRepository } from 'helix-auth-svc/lib/features/login/data/repositories/RedisUserRepository.js'
import { InMemoryRequestRepository } from 'helix-auth-svc/lib/features/login/data/repositories/InMemoryRequestRepository.js'
import { InMemoryUserRepository } from 'helix-auth-svc/lib/features/login/data/repositories/InMemoryUserRepository.js'
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
import TidyAuthProviders from 'helix-auth-svc/lib/features/login/domain/usecases/TidyAuthProviders.js'
import ValidateSamlRequest from 'helix-auth-svc/lib/features/login/domain/usecases/ValidateSamlRequest.js'
import ValidateSamlResponse from 'helix-auth-svc/lib/features/login/domain/usecases/ValidateSamlResponse.js'
import ValidateSwarmConfig from 'helix-auth-svc/lib/features/login/domain/usecases/ValidateSwarmConfig.js'
import ValidateWebToken from 'helix-auth-svc/lib/features/login/domain/usecases/ValidateWebToken.js'
import { HelixEntityRepository } from 'helix-auth-svc/lib/features/scim/data/repositories/HelixEntityRepository.js'
import { InMemoryEntityRepository } from 'helix-auth-svc/lib/features/scim/data/repositories/InMemoryEntityRepository.js'
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

// create the injection container
const container = createContainer({
  injectionMode: InjectionMode.PROXY
})

container.register({
  // register the data repositories as classes
  configRepository: asClass(DotenvRepository),
  defaultsRepository: asClass(DefaultsEnvRepository),
  // dotenvRepository needs to live forever so it won't reload on every resolve
  dotenvRepository: asClass(EnvSettingsRepository, { lifetime: Lifetime.SINGLETON }),
  settingsRepository: asClass(MergedSettingsRepository),
  // temporaryRepository needs to live forever so its Map is not rebuilt on resolve
  temporaryRepository: asClass(MapSettingsRepository, { lifetime: Lifetime.SINGLETON }),
  tokenRepository: asClass(InMemoryTokenRepository),

  // register the use cases as functions
  addGroup: asFunction(AddGroup),
  addUser: asFunction(AddUser),
  addAuthProvider: asFunction(AddAuthProvider),
  assignNameIdentifier: asFunction(AssignNameIdentifier),
  convertFromProviders: asFunction(ConvertFromProviders),
  deleteAuthProvider: asFunction(DeleteAuthProvider),
  deleteWebToken: asFunction(DeleteWebToken),
  fetchSamlMetadata: asFunction(FetchSamlMetadata),
  findRequest: asFunction(FindRequest),
  findUserProfile: asFunction(FindUserProfile),
  formatAuthProviders: asFunction(FormatAuthProviders),
  generateLoginUrl: asFunction(GenerateLoginUrl),
  generateSamlResponse: asFunction(GenerateSamlResponse),
  getGroup: asFunction(GetGroup),
  getGroups: asFunction(GetGroups),
  getIdPConfiguration: asFunction(GetIdPConfiguration),
  getAuthProviders: asFunction(GetAuthProviders),
  getSamlAuthnContext: asFunction(GetSamlAuthnContext),
  getSamlConfiguration: asFunction(GetSamlConfiguration),
  getUser: asFunction(GetUser),
  getUsers: asFunction(GetUsers),
  isClientAuthorized: asFunction(IsClientAuthorized),
  loadAuthorityCerts: asFunction(LoadAuthorityCerts),
  loadEnvironment: asFunction(LoadEnvironment),
  patchGroup: asFunction(PatchGroup),
  patchUser: asFunction(PatchUser),
  readConfiguration: asFunction(ReadConfiguration),
  receiveUserProfile: asFunction(ReceiveUserProfile),
  registerWebToken: asFunction(RegisterWebToken),
  removeGroup: asFunction(RemoveGroup),
  removeUser: asFunction(RemoveUser),
  startRequest: asFunction(StartRequest),
  tidyAuthProviders: asFunction(TidyAuthProviders),
  updateGroup: asFunction(UpdateGroup),
  updateUser: asFunction(UpdateUser),
  validateAuthProvider: asFunction(ValidateAuthProvider),
  validateCredentials: asFunction(ValidateCredentials),
  validateSamlRequest: asFunction(ValidateSamlRequest),
  validateSamlResponse: asFunction(ValidateSamlResponse),
  validateSwarmConfig: asFunction(ValidateSwarmConfig),
  validateWebToken: asFunction(ValidateWebToken),
  verifyWebToken: asFunction(VerifyWebToken),
  writeConfiguration: asFunction(WriteConfiguration),

  // register values that change based on environment (there should be very few
  // and only as they relate to automated testing)
  dotenvFile: asFunction(() => process.env.NODE_ENV === 'automated_tests' ? 'test/test-dot.env' : '.env')
})

export async function registerLateBindings() {
  const settings = container.resolve('settingsRepository')
  const logger = await ConstructLogger({ settingsRepository: settings })()
  let CredentialsRepository = null
  const p4port = settings.get('P4PORT')
  if (p4port && settings.has('ADMIN_P4_AUTH')) {
    logger.debug('container: using Helix admin authentication')
    CredentialsRepository = HelixCredentialsRepository
  } else {
    logger.debug('container: using .env admin authentication')
    CredentialsRepository = EnvCredentialsRepository
  }
  let RequestRepository = null
  let UserRepository = null
  let KeyValueConnector = null
  if (settings.has('REDIS_URL') || settings.has('SENTINEL_CONFIG_FILE')) {
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
  if (p4port) {
    logger.debug('container: registering p4d-helix repositories')
    EntityRepository = HelixEntityRepository
  } else {
    logger.debug('container: registering in-memory-helix repositories')
    EntityRepository = InMemoryEntityRepository
  }
  container.register({
    // register the data repositories as classes
    credentialsRepository: asClass(CredentialsRepository),

    // register the data connectors
    redisSentinel: asFunction(RedisSentinel),
    redisConnector: asClass(KeyValueConnector, { lifetime: Lifetime.SINGLETON }),

    // register the data repositories as classes
    entityRepository: asClass(EntityRepository),
    requestRepository: asClass(RequestRepository),
    userRepository: asClass(UserRepository),

    // register singletons as values
    logger: asValue(logger),
  })
}
await registerLateBindings()

export default container
