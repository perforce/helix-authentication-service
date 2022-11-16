//
// Copyright 2022 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { after, before, describe, it } from 'mocha'
import mute from 'mute'
import { SamlConnector } from 'helix-auth-svc/lib/features/login/data/connectors/SamlConnector.js'

describe('SAML connector', function () {
  let unmute

  before (function () {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0
    // mute the warning from node about disabling TLS validation
    unmute = mute(process.stderr)
  })

  after (function () {
    unmute()
    delete process.env.NODE_TLS_REJECT_UNAUTHORIZED
  })

  it('should raise an error for invalid input', function () {
    assert.throws(() => new SamlConnector({ metadataUrl: null }), AssertionError)
  })

  it('should return not ok for connection refused', async function () {
    // assumes gopher (port 70) is not running on localhost
    const connector = new SamlConnector({ metadataUrl: 'https://localhost:70' })
    try {
      await connector.ping()
      assert.fail('should have raised an error')
    } catch (err) {
      assert.include(err.toString(), 'Error during request')
    }
  })

  it('should return not ok for non-SAML URL', async function () {
    if (process.env.UNIT_ONLY) {
      this.skip()
    } else {
      this.timeout(10000)
      const connector = new SamlConnector({ metadataUrl: 'https://oidc.doc:8843' })
      try {
        await connector.ping()
        assert.fail('should have raised an error')
      } catch (err) {
        assert.include(err.toString(), 'missing identityProviderUrl')
      }
    }
  })

  it('should return ok for working SAML connection', async function () {
    if (process.env.UNIT_ONLY) {
      this.skip()
    } else {
      this.timeout(10000)
      const connector = new SamlConnector({ metadataUrl: 'https://shibboleth.doc:4443/idp/shibboleth' })
      await connector.ping()
    }
  })
})
