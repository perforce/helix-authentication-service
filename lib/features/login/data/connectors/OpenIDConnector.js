//
// Copyright 2022 Perforce Software
//
import * as assert from 'node:assert'
import { Issuer } from 'openid-client'
import { IdentityConnector } from 'helix-auth-svc/lib/features/login/domain/connectors/IdentityConnector.js'

class OpenIDConnector extends IdentityConnector {
  constructor ({ issuerUri }) {
    super()
    assert.ok(issuerUri, 'OIDC issuer URI must be defined')
    this._issuerUri = issuerUri
  }

  async ping () {
    const issuer = await Issuer.discover(this._issuerUri)
    // an OIDC configuration without scopes is basically broken
    if (issuer.scopes_supported === undefined) {
      throw new Error('missing "scopes_supported" in configuration')
    }
  }
}

export { OpenIDConnector }
