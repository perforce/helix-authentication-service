//
// Copyright 2022 Perforce Software
//
import * as assert from 'node:assert'
import * as fs from 'node:fs'

/**
 * Read the configuration for which the service acts as identity provider.
 *
 * @return {Promise} resolves to object with IdP configuration.
 * @throws {Error} if validation fails for any reason.
 */
export default ({ settingsRepository }) => {
  assert.ok(settingsRepository, 'settingsRepository must be defined')
  return async () => {
    let idpConfFile = settingsRepository.get('IDP_CONFIG_FILE')
    // convert relative paths to the base path of this application
    if (idpConfFile.startsWith('./')) {
      idpConfFile = idpConfFile.replace(/^.\//, 'helix-auth-svc/')
    }
    try {
      const module = await import(idpConfFile)
      return module.default
    } catch (err) {
      if (err instanceof ReferenceError) {
        // The IdP configuration uses an extension (.js) that makes Node.js
        // think that the contents are in ES6 format, but apparently that was
        // not the case. As such, read the configuration file and change the
        // syntax to conform to ES6 standards and try again.
        if (idpConfFile.startsWith('helix-auth-svc/')) {
          idpConfFile = idpConfFile.replace(/^helix-auth-svc\//, './')
        }
        const contents = fs.readFileSync(idpConfFile, 'utf-8')
        const filtered = contents.split(/\r?\n/).filter(line => !line.trim().startsWith('//'))
        const folded = filtered.map(line => line.trim()).join('')
        const updated = folded.replace('module.exports =', 'export default')
        const module = await import('data:text/javascript,' + updated)
        return module.default
      } else {
        throw err
      }
    }
  }
}
