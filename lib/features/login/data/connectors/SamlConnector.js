//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'
import { fetch, toPassportConfig } from 'passport-saml-metadata'
import { IdentityConnector } from 'helix-auth-svc/lib/features/login/domain/connectors/IdentityConnector.js'

class SamlConnector extends IdentityConnector {
  constructor ({ metadataUrl }) {
    super()
    assert.ok(metadataUrl, 'SAML metadata URL must be defined')
    this._metadataUrl = metadataUrl
  }

  async ping () {
    const reader = await fetch({ url: this._metadataUrl, backupStore: new Map() })
    const config = toPassportConfig(reader, { multipleCerts: true })
    if (config.identityProviderUrl === undefined) {
      throw new Error('missing identityProviderUrl in metadata')
    }
  }
}

export { SamlConnector }
