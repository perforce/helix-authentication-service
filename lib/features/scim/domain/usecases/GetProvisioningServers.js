//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'

//
// Retrieve the list of configured Helix Core Server instances.
//
export default ({ settingsRepository }) => {
  assert.ok(settingsRepository, 'settingsRepository must be defined')
  return () => {
    const p4port = settingsRepository.get('P4PORT')
    if (p4port) {
      const p4user = settingsRepository.get('P4USER')
      const p4passwd = settingsRepository.get('P4PASSWD')
      return [{ p4port, p4user, p4passwd }]
    } else {
      const provisioning = settingsRepository.get('PROVISIONING')
      const leaders = new Set()
      const domains = new Map()
      if (provisioning) {
        if (provisioning.servers === undefined) {
          throw new Error('missing servers list in provisioning')
        }
        if (!Array.isArray(provisioning.servers)) {
          throw new Error('provisioning servers must be a list')
        }
        // validate the configured servers
        provisioning.servers.forEach((e) => {
          if (e.p4port === undefined) {
            throw new Error(`server ${e} missing p4port`)
          }
          if (e.p4user === undefined) {
            throw new Error(`server ${e.p4port} missing p4user`)
          }
          if (e.p4passwd === undefined) {
            throw new Error(`server ${e.p4port} missing p4passwd`)
          }
          if (e.domains === undefined) {
            throw new Error(`server ${e.p4port} missing domains list`)
          }
          if (!Array.isArray(e.domains)) {
            throw new Error(`server ${e.p4port} domains must be a list`)
          }
          if (e.domains.length === 0) {
            throw new Error(`server ${e.p4port} domains must not be empty`)
          }
          for (const domain of e.domains) {
            if (domains.has(domain)) {
              const count = domains.get(domain)
              domains.set(domain, count + 1)
            } else {
              domains.set(domain, 1)
            }
          }
          if (e.leader) {
            if (Array.isArray(e.leader)) {
              for (const leader of e.leader) {
                if (leaders.has(leader)) {
                  throw new Error(`domain ${leader} already as a leader`)
                }
                leaders.add(leader)
              }
            } else {
              throw new Error(`server ${e.p4port} leader must be a list`)
            }
          }
        })
        // ensure any domains with multiple servers have a leader
        for (const [domain, count] of domains.entries()) {
          if (count > 1 && !leaders.has(domain)) {
            throw new Error(`domain ${domain} must have one leader`)
          }
        }
        return provisioning.servers
      }
    }
    return []
  }
}
