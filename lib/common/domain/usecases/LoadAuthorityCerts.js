//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { glob } from 'glob'

/**
 * Read the certificate authority certs from CA_CERT_FILE and/or CA_CERT_PATH.
 *
 * @return {Array} list of loaded certificates, or undefined if none.
 * @throws {Error} if validation fails for any reason.
 */
export default ({ settingsRepository }) => {
  assert.ok(settingsRepository, 'settingsRepository must be defined')
  return () => {
    let files = []
    // Use node-glob to optionally load multiple CA certificate files.
    // c.f. https://github.com/isaacs/node-glob
    const cacertfile = settingsRepository.get('CA_CERT_FILE')
    if (cacertfile) {
      files = files.concat(glob.sync(cacertfile))
    }
    const cacertpath = settingsRepository.get('CA_CERT_PATH')
    if (cacertpath) {
      const names = fs.readdirSync(cacertpath)
      const paths = names.map(f => {
        return path.join(cacertpath, f)
      })
      files = files.concat(paths)
    }
    if (files.length > 0) {
      const results = files.map(f => {
        const stats = fs.statSync(f)
        if (stats.isFile()) {
          return fs.readFileSync(f)
        }
        return null
      })
      return results.filter((v) => v !== null)
    }
    return undefined
  }
}
