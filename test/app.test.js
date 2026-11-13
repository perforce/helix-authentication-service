//
// Copyright 2026 Perforce Software
//
import { assert } from 'chai'
import { after, describe, it, run } from 'mocha'
// Load the test environment before the bulk of our code initializes, otherwise
// it will be too late due to the `import` early-binding behavior.
import 'helix-auth-svc/test/env.js'
import createApp from 'helix-auth-svc/lib/app.js'
import container from 'helix-auth-svc/lib/container.js'

const temporaryRepository = container.resolve('temporaryRepository')

setTimeout(function () {
  describe('Express app settings', function () {
    after(function () {
      temporaryRepository.delete('TRUST_PROXY')
    })

    it('should enable trust proxy for TRUST_PROXY=true', async function () {
      temporaryRepository.set('TRUST_PROXY', 'true')
      const app = await createApp()
      assert.isTrue(app.get('trust proxy'))
    })

    it('should disable trust proxy for TRUST_PROXY=false', async function () {
      // Boolean('false') is true, which used to enable trust proxy (HAS-727)
      temporaryRepository.set('TRUST_PROXY', 'false')
      const app = await createApp()
      assert.isFalse(app.get('trust proxy'))
    })

    it('should pass other TRUST_PROXY values through', async function () {
      temporaryRepository.set('TRUST_PROXY', 'loopback')
      const app = await createApp()
      assert.equal(app.get('trust proxy'), 'loopback')
    })
  })

  run()
}, 500)
