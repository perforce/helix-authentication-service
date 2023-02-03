//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'
import * as fs from 'node:fs/promises'

// names of settings which contain XML data stored in files
const temporaryFiles = [
  'SAML_IDP_METADATA_FILE',
  'CA_CERT_FILE',
  'CERT_FILE',
  'KEY_FILE',
  'KEY_PASSPHRASE_FILE',
  'OIDC_CLIENT_SECRET_FILE',
  'AUTH_PROVIDERS_FILE'
]

/**
 * Remove all entries from the temporary repository. Any file-based settings
 * will have their corresponding files deleted.
 */
export default ({ temporaryRepository }) => {
  assert.ok(temporaryRepository, 'delete temp: temporaryRepository must be defined')
  return async () => {
    for (const filekey of temporaryFiles) {
      if (temporaryRepository.has(filekey)) {
        const filename = temporaryRepository.get(filekey)
        await fs.unlink(filename)
      }
    }
    temporaryRepository.clear()
  }
}
