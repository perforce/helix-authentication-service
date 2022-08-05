//
// Copyright 2022 Perforce Software
//
import * as assert from 'node:assert'
import dotenv from 'dotenv'

/**
 * Read the dotenv file and apply changes to the environment object.
 *
 * @return {Map} newly incorporated environment settings.
 */
export default ({ dotenvFile }) => {
  assert.ok(dotenvFile, 'dotenvFile must be defined')
  // preserve the most recently evaluated keys
  let dotenvKeys = new Set(Object.keys(dotenv.config({ path: dotenvFile }).parsed || {}))
  return (env) => {
    assert.ok(env, 'env must be defined')
    return new Promise((resolve, reject) => {
      const dotResult = dotenv.config({ path: dotenvFile })
      if (dotResult.error) {
        reject(dotResult.error)
      } else {
        let envConfig = dotResult.parsed
        const newenvKeys = new Set(Object.keys(envConfig))
        // delete settings that were previously set but now are gone
        if (dotenvKeys) {
          for (const oldkey of dotenvKeys) {
            if (!newenvKeys.has(oldkey)) {
              delete env[oldkey]
            }
          }
        }
        for (const k in envConfig) {
          env[k] = envConfig[k]
        }
        dotenvKeys = newenvKeys
        resolve(envConfig)
      }
    })
  }
}
