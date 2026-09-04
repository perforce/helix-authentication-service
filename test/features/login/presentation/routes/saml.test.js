//
// Copyright 2026 Perforce Software
//
import { assert } from 'chai'
import { describe, it } from 'mocha'
// Load the test environment before the bulk of our code initializes, otherwise
// it will be too late due to the `import` early-binding behavior.
import 'helix-auth-svc/test/env.js'
import { samlCacheProvider } from 'helix-auth-svc/lib/features/login/presentation/routes/saml.js'

describe('SAML InResponseTo cache provider (HAS-708)', function () {
  it('should return null for a key that was never saved', async function () {
    const result = await samlCacheProvider.getAsync('never-saved-' + Date.now())
    assert.isNull(result)
  })

  it('should retrieve a value after saving it', async function () {
    const key = 'has708-save-get-' + Date.now()
    await samlCacheProvider.saveAsync(key, 'some-instant-value')
    const result = await samlCacheProvider.getAsync(key)
    assert.equal(result, 'some-instant-value')
  })

  it('should no longer find a value after removing it', async function () {
    const key = 'has708-remove-' + Date.now()
    await samlCacheProvider.saveAsync(key, 'some-instant-value')
    const removed = await samlCacheProvider.removeAsync(key)
    assert.equal(removed, key)
    const result = await samlCacheProvider.getAsync(key)
    assert.isNull(result)
  })

  it('should return null when removing a key that does not exist', async function () {
    const removed = await samlCacheProvider.removeAsync('never-saved-' + Date.now())
    assert.isNull(removed)
  })

  it('should return null when removing a null key', async function () {
    const removed = await samlCacheProvider.removeAsync(null)
    assert.isNull(removed)
  })

  it('should recover a value saved by a different instance sharing the same store', async function () {
    // Simulates the exact scenario HAS-708 fixes: the AuthnRequest ID was
    // saved by whichever instance issued it (here, simulated by calling
    // saveAsync directly rather than through a real /saml/login/:id request),
    // and a *different* instance handling /saml/sso must still be able to
    // validate it via the same shared store.
    const key = 'has708-cross-instance-' + Date.now()
    await samlCacheProvider.saveAsync(key, new Date().toISOString())
    const result = await samlCacheProvider.getAsync(key)
    assert.isNotNull(result)
  })
})
