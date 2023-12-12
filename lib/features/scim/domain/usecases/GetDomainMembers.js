//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'

//
// Retrieve all non-leader Helix Core Server instances for a domain. For the
// classic P4 settings, an empty list is returned since the classic settings
// specify the leader for the domain.
//
export default ({ getProvisioningServers }) => {
  assert.ok(getProvisioningServers, 'getProvisioningServers must be defined')
  return (domain) => {
    const servers = getProvisioningServers()
    if (servers.length > 1 && domain) {
      const results = servers.filter((e) => e.domains && e.domains.some((e) => e === domain))
      if (results.length > 1) {
        return results.filter((e) => e.leader === undefined || e.leader.every((e) => e !== domain))
      }
    }
    // Allow for the case of unit tests that are using the in-memory entity
    // repository, in which case leader/members is irrelevant.
    return []
  }
}
