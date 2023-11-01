//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'

//
// Retrieve the appropriate Helix Core Server instance for a domain.
//
export default ({ getProvisioningServers }) => {
  assert.ok(getProvisioningServers, 'getProvisioningServers must be defined')
  return (domain) => {
    const servers = getProvisioningServers()
    if (servers.length > 0) {
      if (servers.length === 1 && domain === undefined) {
        return servers[0]
      } else if (domain) {
        // find the configured leader, if any
        const leader = servers.find((e) => {
          return e.leader && e.leader.some((e) => e === domain)
        })
        if (leader) {
          return leader
        }
        // find the server that belongs to this domain
        const candidate = servers.find((e) => {
          return e.domains && e.domains.some((e) => e === domain)
        })
        if (candidate) {
          return candidate
        }
      }
    }
    // Allow for the case of unit tests that are using the in-memory entity
    // repository, in which case leader/members is irrelevant.
    return null
  }
}
