//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'
import {
  blockedSettings,
  renamedSettings
} from 'helix-auth-svc/lib/constants.js'

/**
 * Write the (partial) configuration settings to the repository.
 *
 * @param {Map} settings - partial or complete collection of settings.
 */
export default ({ configurationRepository, defaultsRepository, convertFromProviders, cleanAuthProviders }) => {
  assert.ok(configurationRepository, 'configurationRepository must be defined')
  assert.ok(defaultsRepository, 'defaultsRepository must be defined')
  assert.ok(convertFromProviders, 'convertFromProviders must be defined')
  assert.ok(cleanAuthProviders, 'cleanAuthProviders must be defined')
  return async (incoming) => {
    const settings = await configurationRepository.read()
    // elide any settings deemed a security risk, ignoring case since names
    // read from .env are normalized to uppercase (HAS-690, HAS-729)
    for (const key of Array.from(incoming.keys())) {
      if (blockedSettings.includes(String(key).toUpperCase())) {
        incoming.delete(key)
      }
    }
    // fold the incoming settings into the current, removing any settings whose
    // values are empty strings
    incoming.forEach((value, key) => {
      if (value === '') {
        settings.delete(key)
      } else {
        settings.set(key, value)
      }
    })
    await convertFromProviders(settings)
    // remove settings with old names when new names are also present
    for (const [oldname, newname] of Object.entries(renamedSettings)) {
      if (settings.has(oldname) && settings.has(newname)) {
        settings.delete(oldname)
      }
    }
    cleanAuthProviders(settings, defaultsRepository)
    // filter any settings that equal the defaults
    filterDefaults(settings, defaultsRepository)
    await configurationRepository.write(settings)
  }
}

function filterDefaults(settings, defaults) {
  settings.forEach((value, key) => {
    if (defaults.has(key)) {
      // undefined or equal to the default is treated equally
      //
      // intentionally using == to detect more duplicates (e.g. 1 == '1')
      // although it will not catch everything (e.g. false == 'false')
      const defawlt = defaults.get(key)
      if (value === undefined || defawlt == value || defawlt === value.toString()) {
        settings.delete(key)
      }
    }
  })
}
