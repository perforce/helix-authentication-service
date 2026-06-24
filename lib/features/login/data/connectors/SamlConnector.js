//
// Copyright 2024 Perforce Software
//
import * as assert from 'node:assert'
import { fetch, toPassportConfig } from 'passport-saml-metadata'
import { IdentityConnector } from 'helix-auth-svc/lib/features/login/domain/connectors/IdentityConnector.js'

class SamlConnector extends IdentityConnector {
  constructor({ metadataUrl }) {
    super()
    assert.ok(metadataUrl, 'SAML metadata URL must be defined')
    this._metadataUrl = metadataUrl
  }

  async ping() {
    let reader
    try {
      reader = await fetch({
        url: this._metadataUrl,
        backupStore: new Map(),
        timeout: 15000
      })
    } catch (err) {
      // As of passport-saml-metadata 5 (xmldom 0.9), parsing a response that
      // is not well-formed XML throws a ParseError rather than yielding an
      // empty document; a non-SAML URL lands here. Network failures keep their
      // original message ('Error during request').
      if (err.name === 'ParseError') {
        throw new Error('metadata is not valid SAML', { cause: err })
      }
      throw err
    }
    const config = toPassportConfig(reader, { multipleCerts: true })
    if (config.identityProviderUrl === undefined) {
      throw new Error('missing identityProviderUrl in metadata')
    }
  }
}

export { SamlConnector }
