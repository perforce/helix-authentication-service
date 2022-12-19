//
// Copyright 2022 Perforce Software
//
import * as assert from 'node:assert'
import dotenv from 'dotenv'

/**
 * Read the dotenv file and return the evaluated result.
 *
 * @return {Map} evaluated environment settings.
 */
export default ({ dotenvFile }) => {
  assert.ok(dotenvFile, 'dotenvFile must be defined')
  return () => {
    return new Promise((resolve, reject) => {
      const dotResult = dotenv.config({ path: dotenvFile })
      if (dotResult.error) {
        reject(dotResult.error)
      } else {
        resolve(dotResult.parsed)
      }
    })
  }
}
