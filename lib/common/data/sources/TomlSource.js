//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'
import * as fs from 'node:fs'
import * as toml from 'smol-toml'

//
// Data source for reading and writing configuration data in a TOML file. The
// naming convention of the settings is converted from TOML to dotenv and vice
// versa. Top-level properties will be uppercase for dotenv and lowercase for
// TOML, while nested properties are camelCase for dotenv or lowercase with
// underscores for TOML. Special treatment is done for the weird IDP_CONFIG
// object whose properties must remain unmodified.
//
class TomlSource {
  constructor({ tomlFile }) {
    assert.ok(tomlFile, 'toml: tomlFile must be defined')
    this._filename = tomlFile
  }

  read() {
    return new Promise((resolve, reject) => {
      fs.readFile(this._filename, { encoding: 'utf8' }, (err, data) => {
        if (err) {
          if (err.code == 'ENOENT') {
            resolve(new Map())
          } else {
            reject(err)
          }
        } else {
          resolve(parseData(data))
        }
      })
    })
  }

  readSync() {
    try {
      const data = fs.readFileSync(this._filename, { encoding: 'utf8' })
      return parseData(data)
    } catch (err) {
      if (err.code == 'ENOENT') {
        return new Map()
      } else {
        throw err
      }
    }
  }

  write(settings) {
    assert.ok(settings, 'toml: settings must be defined')
    return new Promise((resolve, reject) => {
      const converted = convertToTomlTop(settings)
      // convert the Map to something that smol-toml can work with
      const values = Object.fromEntries(converted)
      const data = toml.stringify(values)
      fs.writeFile(this._filename, data, (err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  // Returns true since TOML supports list and map collections.
  supportsCollections() {
    return true
  }
}

// parse the raw text and return a Map of settings
function parseData(data) {
  return convertToEnvTop(new Map(Object.entries(toml.parse(data))))
}

// perform the naming convention change from TOML to .env
function convertToEnvTop(settings) {
  const uppercased = new Map()
  for (const [key, value] of settings.entries()) {
    const envkey = key.toUpperCase()
    const converted = convertToEnvOther(envkey, value)
    uppercased.set(envkey, converted)
  }
  return uppercased
}

function convertToEnvOther(key, incoming) {
  if (Array.isArray(incoming)) {
    const newarr = []
    for (const entry of incoming) {
      newarr.push(convertToEnvOther(key, entry))
    }
    return newarr
  } else if (typeof incoming === 'object') {
    const newobj = {}
    if (key === 'IDP_CONFIG') {
      // special case for the keys that are used in the IDP_CONFIG array, which
      // should _not_ be modified in any way as they are special identifiers
      for (const [name, value] of Object.entries(incoming)) {
        newobj[name] = convertToEnvOther(name, value)
      }
    } else {
      for (const [name, value] of Object.entries(incoming)) {
        newobj[camelCase(name)] = convertToEnvOther(name, value)
      }
    }
    return newobj
  }
  return incoming
}

// perform the naming convention change from .env to TOML
function convertToTomlTop(settings) {
  const lowercased = new Map()
  for (const [key, value] of settings.entries()) {
    const converted = convertToTomlOther(key, value)
    lowercased.set(key.toLowerCase(), converted)
  }
  return lowercased
}

function convertToTomlOther(key, incoming) {
  if (incoming === null || incoming === undefined) {
    return incoming
  }
  if (Array.isArray(incoming)) {
    const newarr = []
    for (const entry of incoming) {
      newarr.push(convertToTomlOther(key, entry))
    }
    return newarr
  } else if (typeof incoming === 'object') {
    const newobj = {}
    if (key === 'IDP_CONFIG') {
      // special case for the keys that are used in the IDP_CONFIG array, which
      // should _not_ be modified in any way as they are special identifiers
      for (const [name, value] of Object.entries(incoming)) {
        newobj[name] = convertToTomlOther(name, value)
      }
    } else {
      for (const [name, value] of Object.entries(incoming)) {
        newobj[underscore(name)] = convertToTomlOther(name, value)
      }
    }
    return newobj
  }
  return incoming
}

// converts 'this_is_my_name' to 'thisIsMyName'
function camelCase(input) {
  return input.replace(/_([a-z])/g, (g) => { return g[1].toUpperCase() })
}

// converts 'thisIsMyName' to 'this_is_my_name'
function underscore(input) {
  return input.replace(/([a-z][A-Z])/g, (g) => { return g[0] + '_' + g[1].toLowerCase() })
}

export { TomlSource }
