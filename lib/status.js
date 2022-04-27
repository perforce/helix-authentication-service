//
// Copyright 2022 Perforce Software
//
import * as fs from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { OpenIDConnector } from 'helix-auth-svc/lib/features/login/data/connectors/OpenIDConnector.js'
import { SamlConnector } from 'helix-auth-svc/lib/features/login/data/connectors/SamlConnector.js'

// How far in the future to warn about expiring certificates.
const expiringInSeconds = '864000'

// Summarize the results of the status into a single "ok" or "not ok", ignoring
// conditions such as "not configured."
export function summarize (results) {
  return results.reduce((prev, curr) => {
    if (prev !== 'ok') {
      return prev
    }
    if (curr === 'not configured') {
      return 'ok'
    }
    if (typeof curr === 'string' || curr instanceof String) {
      return curr
    }
    // if not a string, then it is assumed to be an error
    return 'not ok'
  }, 'ok')
}

export async function validateCertAuth (caCertFile) {
  if (caCertFile) {
    try {
      await fs.access(caCertFile)
    } catch (err) {
      return err
    }
    // check if the configured authority certificate is expiring soon
    try {
      return await certCheckEnd(caCertFile, expiringInSeconds)
    } catch (err) {
      return err
    }
  }
  return 'not configured'
}

export async function validateServerCert (serviceCert, serviceKey, passphrase) {
  try {
    await fs.access(serviceCert)
  } catch (err) {
    return err
  }
  // check if the configured certificate is expiring soon
  try {
    const result = await certCheckEnd(serviceCert, expiringInSeconds)
    if (result !== 'ok') {
      return result
    }
  } catch (err) {
    return err
  }
  try {
    await fs.access(serviceKey)
  } catch (err) {
    return err
  }
  try {
    await keyCheckOk(serviceKey, passphrase)
  } catch (err) {
    return err
  }
  // verify configured certificate and key match
  try {
    const cert = await certModulus(serviceCert, 'x509')
    const key = await certModulus(serviceKey, 'rsa', passphrase)
    if (cert === key) {
      return 'ok'
    }
    return 'mismatch'
  } catch (err) {
    return err
  }
}

function certCheckEnd (x509file, seconds) {
  const params = [
    'x509', '-in', x509file, '-checkend', seconds, '-noout'
  ]
  return new Promise((resolve, reject) => {
    invokeOpenssl(params, (code, err, out) => {
      if (code === 0) {
        resolve('ok')
      } else if (code === 1) {
        resolve('not ok')
      } else {
        reject(new Error(err + out))
      }
    }).on('error', (err) => {
      reject(err)
    })
  })
}

function keyCheckOk (keyfile, passphrase) {
  return new Promise((resolve, reject) => {
    const params = [
      'rsa', '-in', keyfile, '-check', '-noout'
    ]
    if (passphrase) {
      params.push('-passin', 'pass:' + passphrase)
    }
    // eslint-disable-next-line no-unused-vars
    invokeOpenssl(params, (code, err, out) => {
      if (out.includes('RSA key ok')) {
        resolve('ok')
      } else {
        reject(new Error(err + out))
      }
    }).on('error', (err) => {
      reject(err)
    })
  })  
}

export async function validatePfxFile (keyfile, passphrase) {
  try {
    await fs.access(keyfile)
  } catch (err) {
    return err
  }
  try {
    const contents = await validatePfxMac(keyfile, passphrase)
    return await certCheckEndStdin(contents, expiringInSeconds)
  } catch (err) {
    return err
  }
}

function validatePfxMac (keyfile, passphrase) {
  return new Promise((resolve, reject) => {
    const passin = passphrase ? `pass:${passphrase}` : 'pass:'
    // older versions of openssl throw errors if the password is too short
    const passout = 'pass:foobar'
    const params = [
      'pkcs12', '-info', '-in', keyfile, '-passin', passin, '-passout', passout
    ]
    // eslint-disable-next-line no-unused-vars
    invokeOpenssl(params, (code, err, out) => {
      // OpenSSL/LibreSSL are not an API and thus do not output universally
      // helpful information. To ensure reliable results across different
      // versions of "openssl" we can only check the exit status and hope that
      // the output is usable.
      if (code === 0) {
        resolve(out)
      } else {
        reject(new Error(err + out))
      }
    }).on('error', (err) => {
      reject(err)
    })
  })
}

function certCheckEndStdin (input, seconds) {
  const params = [
    'x509', '-checkend', seconds, '-noout'
  ]
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line no-unused-vars
    invokeOpenssl(params, (code, err, out) => {
      if (code === 0) {
        resolve('ok')
      } else if (code === 1) {
        resolve('not ok')
      } else {
        reject(new Error(err + out))
      }
    }, input).on('error', (err) => {
      reject(err)
    })
  })
}

function certModulus (file, command, passphrase) {
  const params = [
    command, '-in', file, '-modulus', '-noout'
  ]
  if (passphrase) {
    params.push('-passin', 'pass:' + passphrase)
  }
  return new Promise((resolve, reject) => {
    invokeOpenssl(params, (code, err, out) => {
      if (code === 0) {
        resolve(out)
      } else {
        reject(new Error(err + out))
      }
    }).on('error', (err) => {
      reject(err)
    })
  })
}

function invokeOpenssl (params, cb, input) {
  const stdout = []
  const stderr = []
  const proc = spawn('openssl', params)
  if (input) {
    proc.stdin.write(input)
    proc.stdin.end()
  }
  proc.stdout.on('data', (data) => {
    stdout.push(data.toString())
  })
  proc.stderr.on('data', (data) => {
    stderr.push(data.toString())
  })
  proc.on('close', (code) => {
    cb.call(null, code, stderr.join(), stdout.join())
  })
  return proc
}

export async function validateRedis (connector) {
  try {
    if (connector) {
      const client = connector.client()
      if (client['ping']) {
        const res = await client.ping('connection test')
        if (res !== 'connection test') {
          return 'not ok'
        }
        return 'ok'
      }
    }
    return 'not configured'
  } catch (err) {
    return err
  }
}

export async function validatePerforce (repository) {
  if (repository && repository['makeP4']) {
    try {
      const p4 = await repository.makeP4()
      // `p4 info` is a poor test for a working connection since we are primarily
      // concerned with being able to run commands.
      const login = await p4.cmd('login -s')
      if (login.error) {
        return 'not ok'
      }
    } catch (err) {
      return 'not ok'
    }
    return 'ok'
  } else {
    return 'not configured'
  }
}

export async function validateOpenID (issuerUri) {
  if (issuerUri) {
    try {
      const connector = new OpenIDConnector({ issuerUri })
      await connector.ping()
      return 'ok'
    } catch (err) {
      return err
    }
  }
  return 'not configured'
}

export async function validateSaml (metadataUrl) {
  if (metadataUrl) {
    try {
      const connector = new SamlConnector({ metadataUrl })
      await connector.ping()
      return 'ok'
    } catch (err) {
      return err
    }
  }
  return 'not configured'
}

export async function getVersion () {
  try {
    const packageJson = JSON.parse(await fs.readFile('package.json'))
    return packageJson.version
  } catch (err) {
    return err
  }
}
