//
// Copyright 2022 Perforce Software
//
import * as assert from 'node:assert'
import * as fs from 'node:fs'
import dotenv from 'dotenv'
import { ConfigurationRepository } from 'helix-auth-svc/lib/features/admin/domain/repositories/ConfigurationRepository.js'

//
// Implementation of the configuration repository that uses dotenv. Supports a
// subset of the features in dotenv, in that multi-line values will be quoted
// and written as-is. Comments will be discarded, backticks will become quotes.
//
class DotenvRepository extends ConfigurationRepository {
  constructor({ dotenvFile }) {
    super()
    this.dotenvFile = dotenvFile
  }

  read () {
    return new Promise((resolve, reject) => {
      fs.readFile(this.dotenvFile, (err, data) => {
        if (err) {
          if (err.code == 'ENOENT') {
            resolve({})
          } else {
            reject(err)
          }
        } else {
          const config = dotenv.parse(data)
          const asMap = new Map(Object.entries(config))
          resolve(asMap)
        }
      })
    })
  }

  write (settings) {
    assert.ok(settings, 'dotenv: settings must be defined')
    return new Promise((resolve, reject) => {
      const keys = Array.from(settings.keys())
      keys.sort()
      const formatted = []
      for (const key of keys) {
        formatted.push(`${key}='${settings.get(key)}'`)
      }
      const data = formatted.join('\n') + '\n'
      fs.writeFile(this.dotenvFile, data, (err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }
}

export { DotenvRepository }
