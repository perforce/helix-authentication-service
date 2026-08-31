//
// Copyright 2026 Perforce Software
//
import * as undici from 'undici'

// The correct proxy behavior is determined via the `http_proxy` / `https_proxy`
// / `no_proxy` / etc. env vars, using undici's environment-aware dispatcher.
// Shared by OpenIDConnector.js (the /status page ping) and oidc.js (the login
// flow) so both get the same outbound proxy/timeout behavior -- unlike
// openid-client v5's process-wide `custom.setHttpOptionsDefaults()`, v6
// configures this per-Configuration via a `customFetch` hook, so anything
// that calls discovery() needs to be given this explicitly.
const proxyAgent = new undici.EnvHttpProxyAgent({
  // openid-client's old default timeout of 2500ms is too short for some
  // networks
  headersTimeout: 15000,
  bodyTimeout: 15000
})

function oidcFetch (...args) {
  return undici.fetch(args[0], { ...args[1], dispatcher: proxyAgent })
}

export { oidcFetch }
