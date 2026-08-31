//
// Copyright 2022 Perforce Software
//
import * as assert from 'node:assert'
import * as client from 'openid-client'
import { IdentityConnector } from 'helix-auth-svc/lib/features/login/domain/connectors/IdentityConnector.js'
import { oidcFetch } from 'helix-auth-svc/lib/features/login/data/connectors/OidcFetch.js'

class OpenIDConnector extends IdentityConnector {
  constructor ({ issuerUri }) {
    super()
    assert.ok(issuerUri, 'OIDC issuer URI must be defined')
    this._issuerUri = issuerUri
  }

  async ping () {
    // the client id is never used since discovery only fetches and validates
    // the server metadata document, it does not make any authenticated request.
    // oidcFetch is required here (rather than relying on default fetch) so
    // this respects the same outbound proxy configuration as the real login
    // flow in oidc.js.
    const config = await client.discovery(
      new URL(this._issuerUri), 'ping', undefined, undefined, { [client.customFetch]: oidcFetch }
    )
    // an OIDC configuration without scopes is basically broken
    if (config.serverMetadata().scopes_supported === undefined) {
      throw new Error('missing "scopes_supported" in configuration')
    }
  }
}

export { OpenIDConnector }
