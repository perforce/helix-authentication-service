//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'
import * as fs from 'node:fs'
import dotenv from 'dotenv'

//
// Data source for reading and writing configuration data in a .env file.
//
class DotenvSource {
  constructor({ dotenvFile }) {
    assert.ok(dotenvFile, 'dotenv: dotenvFile must be defined')
    this._filename = dotenvFile
  }

  read() {
    return new Promise((resolve, reject) => {
      fs.readFile(this._filename, (err, data) => {
        if (err) {
          if (err.code == 'ENOENT') {
            // When there is no .env file, fall back to the process environment
            // so that settings whose values reference a file (e.g. LOGGING,
            // AUTH_PROVIDERS) can be resolved during parsing. This matters for
            // container deployments that configure the service using only
            // environment variables. (HAS-666)
            resolve(new Map(Object.entries(process.env)))
          } else {
            reject(err)
          }
        } else {
          resolve(decodeValues(new Map(Object.entries(dotenv.parse(data)))))
        }
      })
    })
  }

  readSync() {
    try {
      const data = fs.readFileSync(this._filename)
      return decodeValues(new Map(Object.entries(dotenv.parse(data))))
    } catch (err) {
      if (err.code == 'ENOENT') {
        // see the note in read() regarding the process environment fallback
        return new Map(Object.entries(process.env))
      } else {
        throw err
      }
    }
  }

  write(settings) {
    assert.ok(settings, 'dotenv: settings must be defined')
    return new Promise((resolve, reject) => {
      const keys = Array.from(settings.keys())
      keys.sort()
      const formatted = []
      for (const key of keys) {
        const value = encodeValue(settings.get(key))
        formatted.push(`${key}='${value}'`)
      }
      const data = formatted.join('\n') + '\n'
      fs.writeFile(this._filename, data, (err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  // Returns false as .env does not support list/map collections.
  supportsCollections() {
    return false
  }
}

// The dotenv library has problems when reading values that contain hashes since
// that marks the start of a comment, even if those hashes are within a quoted
// string. See the issue https://github.com/motdotla/dotenv/issues/631 for more
// information.
//
// Additionally, write() wraps each value in single quotes, so a value that
// contains a single quote (or a newline following one) could otherwise break
// out of the quoting and inject additional env keys, bypassing blockedSettings.
// (HAS-679)
//
// The solution here is to base64 encode any troublesome values and prefix the
// value in a way that can be detected when reading the file. This assumes that
// no values will ever start with 'base64:' which is probably true.
const DATA_PREFIX = 'base64:'

function encodeValue(value) {
  if (typeof value === 'string' && /["#'\n\r]/.test(value)) {
    const encoded = Buffer.from(value, 'utf-8').toString('base64')
    return `${DATA_PREFIX}${encoded}`
  }
  return value
}

function decodeValues(settings) {
  settings.forEach((value, key, map) => {
    if (typeof value === 'string' && value.startsWith(DATA_PREFIX)) {
      const encoded = value.substring(DATA_PREFIX.length)
      const decoded = Buffer.from(encoded, 'base64').toString('utf-8')
      map.set(key, decoded)
    }
  })
  return settings
}

export { DotenvSource }
