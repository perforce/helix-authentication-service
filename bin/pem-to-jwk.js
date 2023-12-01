//
// Copyright 2024 Perforce Software
//
import * as fs from 'node:fs/promises'
import { parseArgs } from 'node:util'
import * as jose from 'jose'

let filepath

// Print the usage text to STDOUT.
function usage() {
  console.info(`
Usage:

    node pem-to-jwk.js <path-to-pem-file>

Description:

    Convert a PEM encoded private key into a JSON Web Key for use with OIDC.
    The output of this script can be provided to the OpenID Connect identity
    provider to enable the use of a public/private key pair rather than a
    shared secret. Note that the private key is used as input but the output
    contains only the public components.
`)
}

function readArguments() {
  const options = {
    'help': {
      type: 'boolean',
      short: 'h',
    },
  }
  const { values, positionals } = parseArgs({ options, allowPositionals: true })
  if (values.help) {
    usage()
    return 1
  }
  if (positionals.length == 0) {
    usage()
    return 1
  }
  filepath = positionals[0]
  return 0
}

// Return true if the file is accessible, false otherwise.
async function fileAccessible(filepath) {
  try {
    await fs.access(filepath)
    return true
  } catch (err) {
    return false
  }
}

async function main() {
  if (readArguments() !== 0) {
    process.exitCode = 1
  } else {
    if (!(await fileAccessible(filepath))) {
      console.error(`\nERROR: The filepath '${filepath}' does not refer to a file.\n`)
    } else {
      const pkcs8 = await fs.readFile(filepath, { encoding: 'utf8' })
      if (pkcs8.includes('PRIVATE')) {
        const ecPrivateKey = await jose.importPKCS8(pkcs8, 'RS256')
        const privateKey = await jose.exportJWK(ecPrivateKey)
        privateKey.kid = await jose.calculateJwkThumbprint(privateKey)
        // extract only the public part for this script
        // eslint-disable-next-line no-unused-vars
        const { k, d, dp, dq, p, q, qi, ...jwk } = privateKey;
        console.log(JSON.stringify(jwk, null, 4))
      } else {
        console.error('\nERROR: pass the private key file (first line contains "PRIVATE")\n')
      }
    }
  }
}

await main()
