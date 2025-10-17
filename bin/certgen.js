//
// Copyright 2024, Perforce Software Inc. All rights reserved.
//
// Generate TLS certificates for the auth service and its clients. The files
// generated are no more genuine than those that are provided with the
// installation, but they are different, which itself is an improvement.
//
import assert from 'node:assert'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'
import {
  asClass,
  asValue,
  createContainer,
  InjectionMode,
  Lifetime
} from 'awilix'
import forge from 'node-forge'
import { DefaultsEnvRepository } from 'helix-auth-svc/lib/common/data/repositories/DefaultsEnvRepository.js'
import { BasicConfigRepository } from 'helix-auth-svc/lib/common/data/repositories/BasicConfigRepository.js'
import { EnvSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/EnvSettingsRepository.js'
import { MapSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MapSettingsRepository.js'
import { MergedSettingsRepository } from 'helix-auth-svc/lib/common/data/repositories/MergedSettingsRepository.js'
import { DotenvSource } from 'helix-auth-svc/lib/common/data/sources/DotenvSource.js'
import { TomlSource } from 'helix-auth-svc/lib/common/data/sources/TomlSource.js'

let MONOCHROME = false
let ALLOW_ROOT = false
const ALL_OPTIONS = new Map()

// Return true if the file is accessible, false otherwise.
async function fileAccessible(filepath) {
  try {
    await fs.access(filepath)
    return true
    // eslint-disable-next-line no-unused-vars
  } catch (err) {
    return false
  }
}

// create the injection container
const container = createContainer({
  injectionMode: InjectionMode.PROXY
})

container.register({
  // register the data repositories as classes
  configurationRepository: asClass(BasicConfigRepository),
  // defaultsRepository should live forever to avoid reloading on every resolve
  defaultsRepository: asClass(DefaultsEnvRepository, { lifetime: Lifetime.SINGLETON }),
  // configuredRepository needs to live forever so it won't reload on every resolve
  configuredRepository: asClass(EnvSettingsRepository, { lifetime: Lifetime.SINGLETON }),
  settingsRepository: asClass(MergedSettingsRepository),
  // temporaryRepository needs to live forever so its values are not lost on resolve
  temporaryRepository: asClass(MapSettingsRepository, { lifetime: Lifetime.SINGLETON }),
  dotenvFile: asValue('.env')
})

async function registerLateBindings() {
  // Register the appropriate configuration file data source as a class, based
  // on whether a certain file exists or not. The default is the .env file it
  // nothing else.
  if (await fileAccessible('config.toml')) {
    container.register({
      tomlFile: asValue('config.toml'),
      configSource: asClass(TomlSource),
    })
  } else {
    container.register({
      configSource: asClass(DotenvSource),
    })
  }
}

// Print the given message in green text to STDOUT.
// function highlight(msg) {
//   if (MONOCHROME) {
//     console.info(msg)
//   } else {
//     console.info(`\x1b[32m${msg}\x1b[0m`)
//   }
// }

// Print the given message in red text to STDERR.
function error(msg) {
  if (MONOCHROME) {
    console.error(msg)
  } else {
    console.error(`\x1b[31m${msg}\x1b[0m`)
  }
}

// Print the given message in yellow text to STDERR.
// function warning(msg) {
//   if (MONOCHROME) {
//     console.error(msg)
//   } else {
//     console.error(`\x1b[33m${msg}\x1b[0m`)
//   }
// }

// Print the usage text to STDOUT.
function usage() {
  console.info(`
Usage:

    certgen.sh [-n] [-m] ...

Description:

    Script for easily generating TLS certificates for the service and its
    client applications.

    -h / --help
        Display this help message.

    -m / --monochrome
        Monochrome; no colored text.
 
    --ca
        Creates a new CA cert at the file path in CA_CERT_FILE setting.
        If CA_CERT_FILE is not configured, defaults to certs/ca.crt

    --capath <filepath>
        Create a new CA cert at the given file path.

    --server
        Create a new server certificate, signed by the certificate specified by
        either the CA_CERT_FILE setting or the --capath option. The certificate
        created will be written to the file named by the CERT_FILE setting.
 
    --server-path <filepath>
        Creates a new server certificate at the given file path, signed by the
        certificate specified by either the CA_CERT_FILE setting or the
        --capath option.

    --client <filepath>
        Create a new client certificate, signed by the certificate specified by
        either the CA_CERT_FILE setting or the --capath option.
 
    --saml
        Create a new certificate for use with SAML identity providers and
        applications that connect to P4AS via SAML, such as Swarm. The
        certificate created will be written to the file named by the
        SAML_CERT_FILE setting. If that setting is missing, an error is
        reported.
        
    --saml-path <filepath>
        Create a new certificate for use with SAML identity providers and
        applications that connect to P4AS via SAML, such as Swarm, at the given
        file path, signed by the certificate specified by either the
        CA_CERT_FILE setting or the --capath option.
  
    --update
        If the --capath, --server-path, or --saml-path options were given, then
        the --update option will modify the service configuration to match those
        paths. The value for --capath will be saved as CA_CERT_FILE, the value
        for --server-path will be saved as CERT_FILE, and the value for
        --saml-path will be saved as SAML_CERT_FILE.
 
    --restart
        Restart the service after generating the certificates and optionally
        updating the configuration file.

    --allow-root
        Allow the root user to run this configuration script. This may leave
        some files owned and readable only by the root user, which can cause
        other problems.

See the P4 Authentication Service Administrator Guide for additional
information pertaining to configuring and running the service.
`)
}

function readArguments() {
  const options = {
    'help': {
      type: 'boolean',
      short: 'h',
    },
    'monochrome': {
      type: 'boolean',
      short: 'm',
    },
    'allow-root': {
      type: 'boolean',
    },
    'update': {
      type: 'boolean',
    },
    'restart': {
      type: 'boolean',
    },
    'ca': {
      type: 'boolean',
    },
    'capath': {
      type: 'string',
    },
    'server': {
      type: 'boolean',
    },
    'server-path': {
      type: 'string',
    },
    'saml': {
      type: 'boolean',
    },
    'saml-path': {
      type: 'string',
    },
    'client': {
      type: 'string',
    },
  }
  try {
    const { values } = parseArgs({ options })
    if (values.monochrome) {
      MONOCHROME = true
    }
    if (values.help) {
      usage()
      return 1
    }
    if (values['allow-root']) {
      ALLOW_ROOT = true
    }
    if (values['update']) {
      ALL_OPTIONS.set('update', true)
    }
    if (values['restart']) {
      ALL_OPTIONS.set('restart', true)
    }
    if (values['ca']) {
      ALL_OPTIONS.set('ca', true)
    }
    if (values['capath']) {
      ALL_OPTIONS.set('ca', values['capath'])
    }
    if (values['server']) {
      ALL_OPTIONS.set('server', true)
    }
    if (values['server-path']) {
      ALL_OPTIONS.set('server', values['server-path'])
    }
    if (values['saml']) {
      ALL_OPTIONS.set('saml', true)
    }
    if (values['saml-path']) {
      ALL_OPTIONS.set('saml', values['saml-path'])
    }
    if (values['client']) {
      ALL_OPTIONS.set('client', values['client'])
    }
    return 0
  } catch (err) {
    console.error(err.message || err)
    usage()
    return 1
  }
}

// Ensure OS is compatible and dependencies are already installed.
async function ensureReadiness() {
  if (process.geteuid && process.geteuid() === 0 && !ALLOW_ROOT) {
    error('This script should be run as a non-root user.')
    return 1
  }

  try {
    await fs.access(process.cwd(), fs.constants.R_OK | fs.constants.W_OK)
    // eslint-disable-next-line no-unused-vars
  } catch (err) {
    error('You do not have permission to write to this directory.')
    return 1
  }

  if (process.version.match(/v(20|22)\./) === null) {
    error('Node.js v20 or v22 is required to run this script.')
    error('Please run install.sh to install dependencies.')
    return 1
  }

  return 0
}

function cleanInputs() {
  const merged = container.resolve('settingsRepository')
  const temporary = container.resolve('temporaryRepository')
  if (!merged.has('CA_CERT_FILE')) {
    temporary.set('CA_CERT_FILE', 'certs/ca.crt')
  }
  if (ALL_OPTIONS.has('ca')) {
    const capathDefault = merged.get('CA_CERT_FILE')
    // if --capath was given, then 'ca' is that file path, otherwise it is 'true'
    if (ALL_OPTIONS.get('ca') === true) {
      ALL_OPTIONS.set('ca', capathDefault)
    }
    const capath = ALL_OPTIONS.get('ca')
    if (capath !== capathDefault) {
      temporary.set('CA_CERT_FILE', capath)
    }
  }
  if (ALL_OPTIONS.has('server')) {
    const serverDefault = merged.get('CERT_FILE')
    // if --server-path was given, then 'server' is that file path, otherwise it is 'true'
    if (ALL_OPTIONS.get('server') === true) {
      ALL_OPTIONS.set('server', serverDefault)
    }
    const srvpath = ALL_OPTIONS.get('server')
    if (srvpath !== serverDefault) {
      temporary.set('CERT_FILE', srvpath)
    }
  }
  if (ALL_OPTIONS.has('saml')) {
    const samlDefault = merged.get('SAML_CERT_FILE')
    // if --saml-path was given, then 'saml' is that file path, otherwise it is 'true'
    if (ALL_OPTIONS.get('saml') === true) {
      if (samlDefault === undefined) {
        error('Must configure SAML_CERT_FILE when using --saml, or pass --saml-path')
        return 1
      }
      ALL_OPTIONS.set('saml', samlDefault)
    }
    const samlpath = ALL_OPTIONS.get('saml')
    if (samlpath !== samlDefault) {
      temporary.set('SAML_CERT_FILE', samlpath)
    }
  }
  return 0
}

// Generate the self-signed certificate authority key pair.
async function generateAuthorityCertificate(certfile, keyfile) {
  var keys = forge.pki.rsa.generateKeyPair(4096)
  var cert = forge.pki.createCertificate()
  cert.publicKey = keys.publicKey
  cert.serialNumber = '00' + forge.util.bytesToHex(forge.random.getBytesSync(8))
  cert.validity.notBefore = new Date()
  cert.validity.notAfter = new Date()
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1)
  var attrs = [{
    name: 'commonName',
    value: 'FakeAuthority'
  }]
  cert.setSubject(attrs)
  cert.setIssuer(attrs)

  // self-sign certificate
  cert.sign(keys.privateKey, forge.md.sha256.create())

  // PEM-format keys and cert
  var rsaPrivateKey = forge.pki.privateKeyToAsn1(keys.privateKey)
  var privateKeyInfo = forge.pki.wrapRsaPrivateKey(rsaPrivateKey)
  var pem = {
    privateKey: forge.pki.privateKeyInfoToPem(privateKeyInfo),
    publicKey: forge.pki.publicKeyToPem(keys.publicKey),
    certificate: forge.pki.certificateToPem(cert)
  }
  fs.writeFile(keyfile, pem.privateKey)
  fs.writeFile(certfile, pem.certificate)
}

async function generateCertificate(capriv, commonName, certfile, keyfile) {
  const caprivPem = await fs.readFile(capriv, { encoding: 'utf8' })
  const caPrivateKey = forge.pki.privateKeyFromPem(caprivPem)

  var keys = forge.pki.rsa.generateKeyPair(4096)
  var cert = forge.pki.createCertificate()
  cert.publicKey = keys.publicKey
  cert.serialNumber = '00' + forge.util.bytesToHex(forge.random.getBytesSync(8))
  cert.validity.notBefore = new Date()
  cert.validity.notAfter = new Date()
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1)
  cert.setSubject([{
    name: 'commonName',
    value: commonName
  }])
  // TODO: ideally would get the issuer from the authority cert
  cert.setIssuer([{
    name: 'commonName',
    value: 'FakeAuthority'
  }])

  // sign using authority certificate
  cert.sign(caPrivateKey, forge.md.sha256.create())

  // PEM-format keys and cert
  var rsaPrivateKey = forge.pki.privateKeyToAsn1(keys.privateKey)
  var privateKeyInfo = forge.pki.wrapRsaPrivateKey(rsaPrivateKey)
  var pem = {
    privateKey: forge.pki.privateKeyInfoToPem(privateKeyInfo),
    publicKey: forge.pki.publicKeyToPem(keys.publicKey),
    certificate: forge.pki.certificateToPem(cert)
  }
  fs.writeFile(keyfile, pem.privateKey)
  fs.writeFile(certfile, pem.certificate)
  return forge.pki.getPublicKeyFingerprint(keys.privateKey, { encoding: 'hex', delimiter: ':' })
}

function makeKeyFilename(certFilename) {
  // 4 function calls just to change the extension of a file name
  const ext = path.extname(certFilename)
  const base = path.basename(certFilename, ext)
  const dir = path.dirname(certFilename)
  return path.join(dir, base) + '.key'
}

async function generateCerts() {
  const merged = container.resolve('settingsRepository')
  const temporary = container.resolve('temporaryRepository')
  if (ALL_OPTIONS.has('ca')) {
    const capath = merged.get('CA_CERT_FILE')
    const keyFilename = makeKeyFilename(capath)
    await generateAuthorityCertificate(capath, keyFilename)
    console.info(`\nGenerated new CA certificate: ${capath}, ${keyFilename}`)
  }
  if (ALL_OPTIONS.has('server')) {
    const serverCert = merged.get('CERT_FILE')
    const serverKey = makeKeyFilename(serverCert)
    temporary.set('KEY_FILE', serverKey)
    const capath = merged.get('CA_CERT_FILE')
    const capriv = makeKeyFilename(capath)
    await generateCertificate(capriv, 'authen.doc', serverCert, serverKey)
    console.info(`\nGenerated new server certificate: ${serverCert}, ${serverKey}`)
  }
  if (ALL_OPTIONS.has('client')) {
    const clientCert = ALL_OPTIONS.get('client')
    const clientKey = makeKeyFilename(clientCert)
    const capath = merged.get('CA_CERT_FILE')
    const capriv = makeKeyFilename(capath)
    const fp = await generateCertificate(capriv, 'authen.doc', clientCert, clientKey)
    console.info(`\nGenerated new client certificate: ${clientCert}, ${clientKey}`)
    console.info(`SHA-1 fingerprint: ${fp}`)
  }
  if (ALL_OPTIONS.has('saml')) {
    const samlCert = ALL_OPTIONS.get('saml')
    const samlKey = makeKeyFilename(samlCert)
    const capath = merged.get('CA_CERT_FILE')
    const capriv = makeKeyFilename(capath)
    // the SAML-specific cert is like the server cert, but dedicated to SAML
    await generateCertificate(capriv, 'authen.doc', samlCert, samlKey)
    console.info(`\nGenerated new SAML certificate: ${samlCert}, ${samlKey}`)
  }
}

// Write all of the settings into either the .env or config.toml files.
async function modifyConfig() {
  const repository = container.resolve('configSource')
  const temporary = container.resolve('temporaryRepository')
  const settings = await repository.read()
  let modified = false
  for (const [key, value] of temporary.entries()) {
    settings.set(key, value)
    modified = true
  }
  if (modified) {
    await repository.write(settings)
    console.info('\nUpdated the service configuration.')
  }
}

function invokeExecutable(cmd, params, cb, input) {
  const stdout = []
  const stderr = []
  const proc = spawn(cmd, params)
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
    cb(code, stderr.join(), stdout.join())
  })
  return proc
}

// Invokes the `systemctl` command, prefixed by `sudo`, with the given
// parameters, returning the output if successful.
function invokeSystemctl(params) {
  assert(Array.isArray(params), 'params must be an array')
  assert(params[0] !== 'systemctl', 'params must not include systemctl command')
  params.unshift('systemctl')
  return new Promise((resolve, reject) => {
    invokeExecutable('sudo', params, (code, err, out) => {
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

// Invokes the Windows `net` command with the given parameters, returning the
// output if successful.
function invokeNetCmd(params) {
  assert(Array.isArray(params), 'params must be an array')
  assert(params[0] !== 'net', 'params must not include net command')
  return new Promise((resolve, reject) => {
    invokeExecutable('net', params, (code, err, out) => {
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

// Restart the service for the configuration changes to take effect.
async function restartService() {
  if (process.platform === 'linux') {
    // Try stopping P4AS using systemctl if the service unit is present.
    if (await fileAccessible('/etc/systemd/system/helix-auth.service')) {
      try {
        await invokeSystemctl(['stop', 'helix-auth'])
        // eslint-disable-next-line no-unused-vars
      } catch (err) {
        // ignore any errors as the service may not be running yet
      }
      await invokeSystemctl(['start', 'helix-auth'])
    }
  } else if (process.platform === 'win32') {
    let serviceAvailable = false
    try {
      const svcoutput = await invokeNetCmd(['start'])
      if (svcoutput.includes('Helix Authentication')) {
        serviceAvailable = true
      }
      // eslint-disable-next-line no-unused-vars
    } catch (err) {
      // ignore any errors, nothing we can do if this fails
    }
    if (serviceAvailable) {
      try {
        await invokeNetCmd(['stop', 'helixauthentication.exe'])
        // eslint-disable-next-line no-unused-vars
      } catch (err) {
        // ignore any errors as the service may not be running yet
      }
      await invokeNetCmd(['start', 'helixauthentication.exe'])
    }
  } else {
    console.info('WARNING: cannot restart service on unsupported system.')
  }
  console.info('\nRestarted the authentication service.')
  return 0
}

async function main() {
  // move to the base directory before anything else
  process.chdir(path.dirname(path.dirname(process.argv[1])))
  if (readArguments() !== 0) {
    process.exitCode = 1
  } else if ((await ensureReadiness()) !== 0) {
    process.exitCode = 1
  } else {
    await registerLateBindings()
    if (cleanInputs() !== 0) {
      process.exitCode = 1
    } else if (ALL_OPTIONS.size === 0) {
      usage()
    } else {
      await generateCerts()
      if (ALL_OPTIONS.get('update')) {
        await modifyConfig()
      }
      if (ALL_OPTIONS.get('restart')) {
        await restartService()
      }
    }
  }
}

await main()
