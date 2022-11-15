//
// Copyright 2022 Perforce Software
//
import * as assert from 'node:assert'
import * as fs from 'node:fs'
import passportsamlmetadata from 'passport-saml-metadata'

const { fetch, MetadataReader, toPassportConfig } = passportsamlmetadata
const cachedIdpMetadata = new Map()

/**
 * Retrieve the SAML identity provider metadata from either URL or file.
 * If neither a URL or file are specified, returns given configuration.
 *
 * @param {Object} samlOptions - SAML service provider configuration.
 * @param {String} metadataSource - metadata URL, file path, or undefined.
 * @returns {Promise} resolves to the IdP configuration data.
 * @throws {Error} if fetch or read fails for any reason.
 */
export default () => {
  return (samlOptions, metadataSource) => {
    assert.ok(samlOptions, 'fetch metadata: samlOptions must be defined')
    return new Promise((resolve, reject) => {
      if (metadataSource && metadataSource.startsWith('http')) {
        fetch({
          url: metadataSource,
          backupStore: cachedIdpMetadata
        }).then((reader) => {
          resolve(readIdpMetadata(reader, samlOptions))
        }).catch(err => {
          reject(new Error(`error fetching IdP metadata URL: ${err}`))
        })
      } else if (metadataSource) {
        fs.readFile(metadataSource, 'utf8', (err, data) => {
          if (err) {
            reject(new Error(`error reading IdP metadata file: ${err}`))
          } else {
            const reader = new MetadataReader(data)
            resolve(readIdpMetadata(reader, samlOptions))
          }
        })
      } else if (samlOptions.entryPoint) {
        resolve(samlOptions)
      } else {
        reject(new Error('identity provider not configured'))
      }
    })
  }
}

function readIdpMetadata(reader, samlOptions) {
  // Some services will advertise multiple certs but not all of them are
  // necessarily valid, so pass all of them to the underlying SAML library.
  const config = toPassportConfig(reader, { multipleCerts: true })
  // Merge IdP metadata with the configured settings, allowing the configured
  // values to override anything the IdP provides.
  for (const propName in samlOptions) {
    if (typeof samlOptions[propName] !== 'undefined') {
      config[propName] = samlOptions[propName]
    }
  }
  return config
}
