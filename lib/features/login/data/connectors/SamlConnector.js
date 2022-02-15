//
// Copyright 2022 Perforce Software
//
import * as assert from 'node:assert'
import passportsamlmetadata from 'passport-saml-metadata'
import { IdentityConnector } from 'helix-auth-svc/lib/features/login/domain/connectors/IdentityConnector.js'

const { fetch, toPassportConfig } = passportsamlmetadata

class SamlConnector extends IdentityConnector {
  constructor ({ metadataUrl }) {
    super()
    assert.ok(metadataUrl, 'SAML metadata URL must be defined')
    this._metadataUrl = metadataUrl
  }

  async ping () {
    const reader = await fetch({ url: this._metadataUrl })
    const config = toPassportConfig(reader, { multipleCerts: true })
    if (config.identityProviderUrl === undefined) {
      throw new Error('missing identityProviderUrl in metadata')
    }
  }
}

export { SamlConnector }
