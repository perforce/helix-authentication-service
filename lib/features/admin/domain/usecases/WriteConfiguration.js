//
// Copyright 2022 Perforce Software
//
import * as assert from 'node:assert'

/**
 * Write the (partial) configuration settings to the repository.
 *
 * @param {Map} settings - partial or complete collection of settings.
 */
export default ({ configRepository }) => {
  assert.ok(configRepository, 'write config: repository must be defined')
  return async (settings) => {
    const current = await configRepository.read()
    // elide any settings deemed a security risk
    settings.delete('ADMIN_ENABLED')
    settings.delete('ADMIN_USERNAME')
    settings.delete('ADMIN_PASSWD_FILE')
    // fold the incoming settings into the current
    settings.forEach((value, key) => {
      current.set(key, value)
    })
    await configRepository.write(current)
  }
}
