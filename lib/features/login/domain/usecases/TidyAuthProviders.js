//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'
import * as fs from 'node:fs/promises'
import * as url from 'node:url'
import { MetadataReader } from 'passport-saml-metadata'

/**
 * Prepare the authentication provider objects for general use. As a
 * side-effect, the providers will be sorted in place according to their labels.
 *
 * @param {Array} providers - auth providers as from getAuthProviders.
 * @return {Promise} resolves to undefined.
 */
export default () => {
  return async (providers) => {
    assert.ok(providers, 'providers must be defined')
    // attempt to assign a protocol as it is easy to forget
    ensureProtocol(providers)
    // generate labels using the available information
    await ensureLabels(providers)
    // Assign unique identifiers to each provider, sorting them by label for
    // consistent numbering. While this only matters during the runtime of
    // the service, it is important that multiple service instances use the
    // same identifiers for the same set of providers.
    ensureIdentifiers(providers)
  }
}

function ensureProtocol(providers) {
  providers.forEach((e) => {
    if (!('protocol' in e)) {
      // OIDC must always have an issuerUri whereas SAML does not
      if (e.issuerUri) {
        e.protocol = 'oidc'
      } else {
        e.protocol = 'saml'
      }
    }
  })
}

async function ensureLabels(providers) {
  for (const provider of providers) {
    if (provider.protocol === 'oidc') {
      ensureLabel(provider, 'issuerUri')
    } else if (provider.protocol === 'saml') {
      ensureLabel(provider, 'metadataUrl')
      ensureLabel(provider, 'idpEntityId')
      ensureLabel(provider, 'signonUrl')
      if (!provider.label && 'metadataFile' in provider) {
        const filename = provider['metadataFile']
        const contents = await fs.readFile(filename, 'utf8')
        provider['metadata'] = contents.trim()
        delete provider['metadataFile']
      }
      if (!provider.label && 'metadata' in provider) {
        const reader = new MetadataReader(provider['metadata'])
        if (reader.entityId) {
          provider['label'] = reader.entityId
        }
      }
    }
  }
}

function ensureLabel(provider, uriName) {
  if (!provider.label && uriName in provider) {
    const maybeUri = provider[uriName]
    try {
      const u = new url.URL(maybeUri)
      provider['label'] = u.hostname
    } catch (err) {
      // maybe not a URL but an entity ID
      provider['label'] = maybeUri
    }
  }
}

// side-effect: sorts identifiers by label
function ensureIdentifiers(providers) {
  providers.sort((a, b) => {
    if (a.label && b.label) {
      return a.label.localeCompare(b.label)
    }
    return 0
  })
  providers.forEach((e, i) => {
    // only assign identifiers to providers that have a label
    if (!('id' in e) && e.label) {
      e.id = `${e.protocol}-${i}`
    }
  })
}
