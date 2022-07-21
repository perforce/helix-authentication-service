//
// Copyright 2022 Perforce Software
//
import * as assert from 'node:assert'

/**
 * Read the configuration settings from the repository.
 *
 * @returns {Map} configuration values.
 */
export default ({ configRepository }) => {
  assert.ok(configRepository, 'read config: repository must be defined')
  return async () => {
    const settings = await configRepository.read()
    // elide any settings deemed a security risk
    settings.delete('ADMIN_ENABLED')
    settings.delete('ADMIN_USER')
    settings.delete('ADMIN_PASSWD_FILE')
    return settings
  }
}
