//
// Copyright 2022 Perforce Software
//
import { AssertionError } from 'node:assert'
import { assert } from 'chai'
import { after, before, describe, it } from 'mocha'
import mute from 'mute'
import { OpenIDConnector } from 'helix-auth-svc/lib/features/login/data/connectors/OpenIDConnector.js'

describe('OpenID connector', function () {
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
    assert.throws(() => new OpenIDConnector({ issuerUri: null }), AssertionError)
  })

  it('should return not ok for connection refused', async function () {
    // assumes gopher (port 70) is not running on localhost
    const connector = new OpenIDConnector({ issuerUri: 'https://localhost:70' })
    try {
      await connector.ping()
      assert.fail('should have raised an error')
    } catch (err) {
      assert.equal(err.code, 'ECONNREFUSED')
    }
  })

  it('should return not ok for non-OIDC URI', async function () {
    if (process.env.UNIT_ONLY) {
      this.skip()
    } else {
      this.timeout(10000)
      const connector = new OpenIDConnector({ issuerUri: 'https://shibboleth.doc:4443' })
      try {
        await connector.ping()
        assert.fail('should have raised an error')
      } catch (err) {
        assert.include(err.toString(), 'expected 200 OK')
      }
    }
  })

  it('should return ok for working OIDC connection', async function () {
    if (process.env.UNIT_ONLY) {
      this.skip()
    } else {
      this.timeout(10000)
      const connector = new OpenIDConnector({ issuerUri: 'https://oidc.doc:8843' })
      await connector.ping()
    }
  })
})
