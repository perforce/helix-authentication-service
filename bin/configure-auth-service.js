//
// Copyright 2024, Perforce Software Inc. All rights reserved.
//
// Configuration script for Helix Authentication Service.
//
// This script is UNTESTED, UNSUPPORTED, and UNDOCUMENTED. Use the
// configure-auth-service.sh script instead of this one.
//
import assert from 'node:assert'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import readline from 'node:readline/promises'
import readlineSync from 'node:readline'
import { parseArgs } from 'node:util'
import { DotenvSource } from 'helix-auth-svc/lib/common/data/sources/DotenvSource.js'
import { TomlSource } from 'helix-auth-svc/lib/common/data/sources/TomlSource.js'

let INTERACTIVE = true
let MONOCHROME = false
let ALLOW_ROOT = false
let SVC_RESTARTED = false
let DEBUG = false
let CONFIGURE_AUTH = true
let CONFIGURE_SCIM = true
let PROTOCOLS = []
let FOUND_P4 = true
let INJECT_P4TRUST = false
const P4D_MIN_CHANGE = '1797576'
const P4D_MIN_VERSION = '2019.1'
let CONFIG_FILE_NAME = '.env'
let P4_PATH
const ALL_SETTINGS = new Map()

// Print the argument in green text.
function highlight(msg) {
  if (MONOCHROME) {
    console.info(msg)
  } else {
    console.info(`\x1b[32m${msg}\x1b[0m`)
  }
}

// Print the first argument in red text on STDERR.
function error(msg) {
  if (MONOCHROME) {
    console.error(msg)
  } else {
    console.error(`\x1b[31m${msg}\x1b[0m`)
  }
}

// Print the first argument in yellow text on STDERR.
function warning(msg) {
  if (MONOCHROME) {
    console.error(msg)
  } else {
    console.error(`\x1b[33m${msg}\x1b[0m`)
  }
}

// Print the input validation error in red text on STDERR.
function errorPrompt(msg) {
  if (INTERACTIVE) {
    error(msg)
  }
}

// Print the usage text to STDOUT.
function usage() {
  console.info(`
Usage:

    configure-auth-service.sh [-n] [-m] ...

Description:

    Configuration script for Helix Authentication Service.

    This script will modify the .env file according to the values provided
    via arguments or interactive input, and then restart the service using
    the systemctl command.

    -h / --help
        Display this help message.

    -m / --monochrome
        Monochrome; no colored text.

    -n / --non-interactive
        Non-interactive mode; exits immediately if prompting is required.

    --admin-user <username>
        If given, along with --admin-passwd, will configure the service to
        provide an administrative web interface.

    --admin-passwd <password>
        If given, along with the --admin-user, will configure the service to
        provide an administrative web interface.

    --allow-root
        Allow the root user to run the configure script. This may leave
        some files owned and readable only by the root user, which can
        cause other problems. Similarly, the P4TRUST and P4TICKETS values
        may reference the root user's home directory.

    --base-url <base-url>
        HTTP/S address of this service.

    --bearer-token <token>
        HTTP Bearer token for authentication of SCIM requests.

    --debug
        Enable debugging output for this configuration script.

    --default-protocol <protocol>
        Set the default protocol to be used when a client application does
        not specify a protocol to be used. This option only applies when
        configuring more than one protocol.

    --enable-admin
        Enable the administrative web interface. Requires the --admin-user
        and --admin-passwd options to complete the configuration.

    --oidc-issuer-uri <issuer-uri>
        Issuer URI for the OpenID Connect identity provider.

    --oidc-client-id <client-id>
        Client identifier for connecting to OIDC identity provider.

    --oidc-client-secret <client-secret>
        Client secret associated with the OIDC client identifier.

    --p4port <p4port>
        The P4PORT for the Helix Core server for user provisioning.

    --saml-idp-metadata-url <metdata-url>
        URL for the SAML identity provider configuration metadata.

    --saml-idp-sso-url <sso-url>
        URL for the SAML identity provider SSO endpoint.

    --saml-sp-entityid <entity-id>
        SAML entity identifier for this service.

    --super <username>
        Helix Core super user's username for user provisioning.

    --superpassword <password>
        Helix Core super user's password for user provisioning.

See the Helix Authentication Service Administrator Guide for additional
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
    'non-interactive': {
      type: 'boolean',
      short: 'n',
    },
    'admin-user': {
      type: 'string',
    },
    'admin-passwd': {
      type: 'string',
    },
    'base-url': {
      type: 'string',
    },
    'bearer-token': {
      type: 'string',
    },
    'enable-admin': {
      type: 'boolean',
    },
    'p4port': {
      type: 'string',
    },
    'super': {
      type: 'string',
    },
    'superpassword': {
      type: 'string',
    },
    'oidc-issuer-uri': {
      type: 'string',
    },
    'oidc-client-id': {
      type: 'string',
    },
    'oidc-client-secret': {
      type: 'string',
    },
    'saml-idp-metadata-url': {
      type: 'string',
    },
    'saml-idp-sso-url': {
      type: 'string',
    },
    'saml-sp-entityid': {
      type: 'string',
    },
    'default-protocol': {
      type: 'string',
    },
    'allow-root': {
      type: 'boolean',
    },
    'debug': {
      type: 'boolean',
    },
  }
  const { values } = parseArgs({ options })
  if (values.monochrome) {
    MONOCHROME = true
  }
  if (values.help) {
    usage()
    return 1
  }
  if (values.debug) {
    DEBUG = true
  }
  if (values['admin-user']) {
    ALL_SETTINGS.set('ADMIN_USERNAME', values['admin-user'])
  }
  if (values['admin-passwd']) {
    ALL_SETTINGS.set('ADMIN_PASSWD', values['admin-passwd'])
  }
  if (values['allow-root']) {
    ALLOW_ROOT = true
  }
  if (values['base-url']) {
    ALL_SETTINGS.set('SVC_BASE_URI', values['base-url'])
  }
  if (values['bearer-token']) {
    ALL_SETTINGS.set('BEARER_TOKEN', values['bearer-token'])
  }
  if (values['enable-admin']) {
    ALL_SETTINGS.set('ADMIN_ENABLED', 'yes')
  }
  if (values['p4port']) {
    ALL_SETTINGS.set('P4PORT', values['p4port'])
  }
  if (values['super']) {
    ALL_SETTINGS.set('P4USER', values['super'])
  }
  if (values['superpassword']) {
    ALL_SETTINGS.set('P4PASSWD', values['superpassword'])
  }
  if (values['oidc-issuer-uri']) {
    ALL_SETTINGS.set('OIDC_ISSUER_URI', values['oidc-issuer-uri'])
  }
  if (values['oidc-client-id']) {
    ALL_SETTINGS.set('OIDC_CLIENT_ID', values['oidc-client-id'])
  }
  if (values['oidc-client-secret']) {
    ALL_SETTINGS.set('OIDC_CLIENT_SECRET', values['oidc-client-secret'])
  }
  if (values['saml-idp-metadata-url']) {
    ALL_SETTINGS.set('SAML_IDP_METADATA_URL', values['saml-idp-metadata-url'])
  }
  if (values['saml-idp-sso-url']) {
    ALL_SETTINGS.set('SAML_IDP_SSO_URL', values['saml-idp-sso-url'])
  }
  if (values['saml-sp-entityid']) {
    ALL_SETTINGS.set('SAML_SP_ENTITY_ID', values['saml-sp-entityid'])
  }
  if (values['default-protocol']) {
    ALL_SETTINGS.set('DEFAULT_PROTOCOL', values['default-protocol'])
  }
  if (values['non-interactive']) {
    INTERACTIVE = false
  }
  return 0
}

// Show the argument values already provided.
function displayArguments() {
  const value = (name) => {
    if (ALL_SETTINGS.has(name)) {
      return ALL_SETTINGS.get(name)
    }
    return '(not specified)'
  }
  highlight(`
Summary of arguments passed:

Service base URL               [${value('SVC_BASE_URI')}]
Administrative user            [${value('ADMIN_USERNAME')}]
OIDC Issuer URI                [${value('OIDC_ISSUER_URI')}]
OIDC Client ID                 [${value('OIDC_CLIENT_ID')}]
SAML IdP Metadata URL          [${value('SAML_IDP_METADATA_URL')}]
SAML IdP SSO URL               [${value('SAML_IDP_SSO_URL')}]
SAML SP Entity ID              [${value('SAML_SP_ENTITY_ID')}]
Default protocol               [${value('DEFAULT_PROTOCOL')}]
Helix server P4PORT            [${value('P4PORT')}]
Helix super-user               [${value('P4USER')}]

For a list of other options, type Ctrl-C to exit, and run this script with
the --help option.

`)
}

// Show a message about the interactive configuration procedure.
function displayInteractive() {
  highlight(`
You have entered interactive configuration for the service. This script will
ask a series of questions, and use your answers to configure the service for
first time use. Options passed in from the command line or automatically
discovered in the environment will be presented as defaults. You may press
enter to accept them, or enter an alternative.
`)
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

// Returns filepath if it refers to an existing file, otherwise throws an error.
async function checkFileExists(filepath) {
  if ((await fs.stat(filepath)).isFile()) {
    return filepath
  }
  throw new Error(`not a file: ${filepath}`)
}

async function findExecutable(exe) {
  //
  // from https://abdus.dev/posts/checking-executable-exists-in-path-using-node/
  //
  // This will find an executable even if it has an extension on Windows, via
  // the PATHEXT environment variable. Not the most efficient memory usage, but
  // it is straightforward.
  //
  const envPath = process.env.PATH || ''
  const envExt = process.env.PATHEXT || ''
  const pathDirs = envPath.replace(/["]+/g, '').split(path.delimiter).filter(Boolean)
  const extensions = envExt.split(';')
  const candidates = pathDirs.flatMap((d) =>
    extensions.map((ext) => path.join(d, exe + ext))
  )
  try {
    return await Promise.any(candidates.map(checkFileExists))
  } catch (e) {
    return null
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

function invokeP4(params, input) {
  assert(Array.isArray(params), 'params must be an array')
  const P4USER = ALL_SETTINGS.get('P4USER')
  if (P4USER) {
    params.unshift('-u', P4USER)
  }
  const P4PORT = ALL_SETTINGS.get('P4PORT')
  if (P4PORT) {
    params.unshift('-p', P4PORT)
  }
  return new Promise((resolve, reject) => {
    invokeExecutable(P4_PATH, params, (code, err, out) => {
      if (code === 0) {
        resolve(out)
      } else {
        reject(new Error(err + out))
      }
    }, input).on('error', (err) => {
      reject(err)
    })
  })
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

// Ensure OS is compatible and dependencies are already installed.
async function ensureReadiness() {
  if (process.geteuid && process.geteuid() === 0 && !ALLOW_ROOT) {
    error('This script should be run as a non-root user.')
    return 1
  }

  try {
    await fs.access(process.cwd(), fs.constants.R_OK | fs.constants.W_OK)
  } catch (err) {
    error('You do not have permission to write to this directory.')
    return 1
  }

  if (process.version.match(/v(16|18|20)\./) === null) {
    error('Node.js v16, v18, or v20 is required to run the service.')
    error('Please run install.sh to install dependencies.')
    return 1
  }

  try {
    await fs.access('node_modules', fs.constants.R_OK)
  } catch (err) {
    error('Module dependencies are missing. Please run install.sh before proceeding.')
    return 1
  }

  P4_PATH = await findExecutable('p4')
  if (P4_PATH === null) {
    FOUND_P4 = false
    CONFIGURE_SCIM = false
    warning('Perforce client "p4" is required for user provisioning.')
  }
  return 0
}

async function sourceP4settings() {
  if (FOUND_P4) {
    // if p4 is available _and_ certain settings are not already defined by the
    // command-line arguments, source them from p4 itself
    if (!ALL_SETTINGS.get('P4PORT')) {
      const p4port = await invokeP4(['set', '-q', 'P4PORT'])
      if (p4port) {
        const parts = p4port.trim().split('=', 2)
        ALL_SETTINGS.set('P4PORT', parts[1])
      }
    }
    if (!ALL_SETTINGS.get('P4USER')) {
      const p4user = await invokeP4(['set', '-q', 'P4USER'])
      if (p4user) {
        const parts = p4user.trim().split('=', 2)
        ALL_SETTINGS.set('P4USER', parts[1])
      }
    }
  }
}

// Fold any settings from the file into the collection of settings that will be
// presented to the user. Everything is read from the file so that it will be
// written back out in its entirety, without losing any existing values.
async function readSettings() {
  let settings
  if (await fileAccessible('config.toml')) {
    const repository = new TomlSource({ tomlFile: 'config.toml' })
    settings = await repository.read()
    CONFIG_FILE_NAME = 'config.toml'
  } else if (await fileAccessible('.env')) {
    const repository = new DotenvSource({ dotenvFile: '.env' })
    settings = await repository.read()
  }
  // inject some default values for certain settings
  if (!ALL_SETTINGS.has('ADMIN_PASSWD_FILE')) {
    ALL_SETTINGS.set('ADMIN_PASSWD_FILE', 'admin-passwd.txt')
  }
  if (!ALL_SETTINGS.has('OIDC_CLIENT_SECRET_FILE')) {
    ALL_SETTINGS.set('OIDC_CLIENT_SECRET_FILE', 'client-secret.txt')
  }
  if (!ALL_SETTINGS.has('BEARER_TOKEN_FILE')) {
    ALL_SETTINGS.set('BEARER_TOKEN_FILE', 'bearer-token.txt')
  }
  if (settings) {
    for (const [key, value] of settings.entries()) {
      if (!ALL_SETTINGS.get(key)) {
        ALL_SETTINGS.set(key, value)
      }
    }
    const readFileToSetting = async (fileSetting, settingName) => {
      const filename = ALL_SETTINGS.get(fileSetting)
      if (filename && await fileAccessible(filename)) {
        const value = await fs.readFile(filename, { encoding: 'utf8' })
        ALL_SETTINGS.set(settingName, value)
      }
    }
    await readFileToSetting('BEARER_TOKEN_FILE', 'BEARER_TOKEN')
    await readFileToSetting('OIDC_CLIENT_SECRET_FILE', 'OIDC_CLIENT_SECRET')
    if (ALL_SETTINGS.get('ADMIN_ENABLED') === 'true') {
      ALL_SETTINGS.set('ADMIN_ENABLED', 'yes')
    } else {
      ALL_SETTINGS.set('ADMIN_ENABLED', 'no')
    }
    await readFileToSetting('ADMIN_PASSWD_FILE', 'ADMIN_PASSWD')
  }
}

// Prompt the user for information by showing a prompt string. Optionally calls
// a validation function to check if the response is OK.
async function promptFor(name, prompt, defaultValue, validator) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  defaultValue = defaultValue ? defaultValue.trim() : ''
  if (validator === undefined) {
    validator = () => 0
  }
  let response
  do {
    if (defaultValue) {
      response = await rl.question(`${prompt} [${defaultValue}]: `)
      if (response === '') {
        response = defaultValue
      }
    } else {
      response = await rl.question(`${prompt}: `)
    }
  } while (validator(response) !== 0)
  ALL_SETTINGS.set(name, response)
  rl.close()
}

// Prompts for a secret that is not echoed to the screen.
async function readlineSecret(prompt) {
  return new Promise((resolve) => {
    const rl = readlineSync.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    rl._writeToOutput = (msg) => {
      if (rl.stdoutMuted) {
        rl.output.write("*")
      } else {
        rl.output.write(msg)
      }
    }
    rl.setPrompt(`${prompt}: `)
    rl.prompt()
    rl.stdoutMuted = true
    rl.on('line', (line) => {
      rl.stdoutMuted = false
      rl.output.write('\n')
      rl.close()
      resolve(line)
    })
  })
}

// Prompt the user for a password that will be verified soon after, and thus
// only one prompt is issued.
async function promptForPassword(name, prompt, defaultValue, validator) {
  defaultValue = defaultValue ? defaultValue.trim() : ''
  if (validator === undefined) {
    validator = () => 0
  }
  let response
  do {
    if (defaultValue) {
      // conceal the length of the incoming password
      response = await readlineSecret(`${prompt} [************]`)
      if (response === '') {
        response = defaultValue
      }
    } else {
      response = await readlineSecret(prompt)
    }
  } while (validator(response) !== 0)
  ALL_SETTINGS.set(name, response)
}

// Prompt the user for a secret value two times and compare values, ensuring
// they match, as the value will not be verified by this script.
async function promptForSecret(name, prompt, defaultValue, validator) {
  defaultValue = defaultValue ? defaultValue.trim() : ''
  if (validator === undefined) {
    validator = () => 0
  }
  let response
  /* eslint no-constant-condition: ["error", { "checkLoops": false }] */
  while (true) {
    if (defaultValue) {
      // conceal the length of the incoming password
      response = await readlineSecret(`${prompt} [************]`)
      if (response === '') {
        response = defaultValue
      }
    } else {
      response = await readlineSecret(prompt)
    }
    if (validator(response) === 0) {
      // if value was not entered (or matches the default) then there is no need
      // to prompt again and compare the two values
      if (defaultValue && response === defaultValue) {
        break
      }
      const verify = await readlineSecret('Please enter the value again')
      if (response === verify) {
        break
      }
      errorPrompt('Secret values do not match. Please try again.')
    }
  }
  ALL_SETTINGS.set(name, response)
}

// Display the given prompt and prompt for a yes/no response.
async function promptForYesNo(name, prompt, defaultValue) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  defaultValue = defaultValue ? defaultValue.trim() : ''

  // read the yes/no input like any other input
  let response
  if (defaultValue) {
    response = await rl.question(`${prompt} [${defaultValue}]: `)
    if (response === '') {
      response = defaultValue
    }
  } else {
    response = await rl.question(`${prompt}: `)
  }
  const lower = response.toLowerCase()
  ALL_SETTINGS.set(name, lower === 'yes' || lower === 'y' ? 'yes' : 'no')
  rl.close()
}

// Prompt for the base URL of the authentication service.
async function promptForSvcBaseUri() {
  console.info(`


The URL of this service, which must be visible to end users. It must match
the application settings defined in the IdP configuration. The URL must
begin with either http: or https:, and maybe include a port number. If the
URL contains a port number, then the service will listen for connections
on that port.

It is strongly recommended to use HTTPS over HTTP as many browsers will not
send cookies over an insecure connection when using OIDC/SAML protcols.

Example: https://has.example.com:3000/

`)
  await promptFor('SVC_BASE_URI', 'Enter the URL for this service', ALL_SETTINGS.get('SVC_BASE_URI'), validateUrl)
}

// Prompt for the choice of using the administrative web interface to configure
// the service, or configuring everything with this script.
async function promptForWebAdmin() {
  console.info(`


This service can be configured using this script, or the service can be
configured to enable an administrative web interface. If the web interface
is enabled, then the configuration can be performed there.

If you choose to enable the web interface, be aware that anyone that can
access the service can attempt to connect to the administrative interface.
Choosing a strong password is important.

It is strongly recommended that the service URL use HTTPS instead of HTTP
as the admin credentials and JSON web token are sent over the network.

`)
  await promptForYesNo('ADMIN_ENABLED', 'Do you want to enable the admin interface?', ALL_SETTINGS.get('ADMIN_ENABLED'))
}

async function promptForAdminCreds() {
  console.info(`


To enable the administrative web interface, please choose a username and
password that will be used to authenticate the administrator. Neither the
name nor the password have any relation to other applications, they are
strictly for accessing the administrative web interface.

`)
  await promptFor('ADMIN_USERNAME', 'Enter a username for the admin user', ALL_SETTINGS.get('ADMIN_USERNAME'), validateNotEmpty)
  await promptForSecret('ADMIN_PASSWD', 'Enter a password for the admin user', ALL_SETTINGS.get('ADMIN_PASSWD'))
}

// Prompt for which features are to be configured.
async function promptForFeatures() {
  console.info(`


The service can support authentication integration or user provisioning,
as well as both features simultaneously. Please choose which features you
wish to configure from the options below.

  1) Authentication
  2) Provisioning
  3) Both

`)
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  const validator = (input) => {
    if (input === '1' || input === '2' || input === '3') {
      return 0
    }
    return 1
  }
  let response
  do {
    response = await rl.question('1, 2, or 3: ')
  } while (validator(response) !== 0)
  if (response === '1') {
    CONFIGURE_AUTH = true
    CONFIGURE_SCIM = false
  } else if (response === '2') {
    CONFIGURE_AUTH = false
    CONFIGURE_SCIM = true
  } else {
    CONFIGURE_AUTH = true
    CONFIGURE_SCIM = true
  }
  rl.close()
}

// Prompt for which protocols to configure(e.g.OIDC, SAML, both).
async function promptForProtocols() {
  console.info(`


The service can support both OpenID Connect and SAML 2.0, as well as both
protocols simultaneously. Please choose which protocols you wish to
configure from the options below.

  1) OIDC
  2) SAML
  3) Both

`)
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  const validator = (input) => {
    if (input === '1' || input === '2' || input === '3') {
      return 0
    }
    return 1
  }
  let response
  do {
    response = await rl.question('1, 2, or 3: ')
  } while (validator(response) !== 0)
  if (response === '1') {
    PROTOCOLS['oidc'] = 1
    delete PROTOCOLS['saml']
  } else if (response === '2') {
    delete PROTOCOLS['oidc']
    PROTOCOLS['saml'] = 1
  } else {
    PROTOCOLS['oidc'] = 1
    PROTOCOLS['saml'] = 1
  }
  rl.close()
}

// Prompt for the OIDC issuer URI.
async function promptForOidcIssuerUri() {
  console.info(`


URI for the OIDC identity provider issuer, typically a URL. This value will
always begin with https: as that is required by the OIDC standard.

Example: https://oidc.example.com/

`)
  await promptFor('OIDC_ISSUER_URI', 'Enter the URI for OIDC issuer', ALL_SETTINGS.get('OIDC_ISSUER_URI'), validateHttpsUrl)
}

// Prompt for the OIDC client identifier.
async function promptForOidcClientId() {
  console.info(`


The client identifier as provided by the OIDC identity provider.

`)
  await promptFor('OIDC_CLIENT_ID', 'Enter the OIDC client ID', ALL_SETTINGS.get('OIDC_CLIENT_ID'), validateNotEmpty)
}

// Prompt for the OIDC client secret.
async function promptForOidcClientSecret() {
  console.info(`


The client secret as provided by the OIDC identity provider.

`)
  await promptForSecret('OIDC_CLIENT_SECRET', 'Enter the OIDC client secret', ALL_SETTINGS.get('OIDC_CLIENT_SECRET'), validateNotEmpty)
}

// Prompt for the SAML IdP metadata URL.
async function promptForSamlIdpMetadataUrl() {
  console.info(`


URL of the SAML identity provider metadata configuration in XML format.
This may help to configure several other SAML settings automatically.
If your identity provider does not provide a metadata URL, simply press
Enter and then provide a value for the SSO (single-sign-on) URL at the
next prompt.

Example: https://idp.example.com:8080/saml/metadata

`)
  await promptFor('SAML_IDP_METADATA_URL', 'Enter the URL for SAML IdP metadata', ALL_SETTINGS.get('SAML_IDP_METADATA_URL'), optionalUrl)
}

// Prompt for the SAML IdP SSO URL.
async function promptForSamlIdpSsoUrl() {
  console.info(`


URL of SAML identity provider Single Sign-On service. If the metadata
already contains this value, you do not need to enter one here.

Example: https://idp.example.com/test-app-12345/sso/saml

`)
  if (ALL_SETTINGS.has('SAML_IDP_METADATA_URL')) {
    console.info('This value may be used to override the SSO URL in the SAML metadata.')
  }
  await promptFor('SAML_IDP_SSO_URL', 'Enter the URL for SAML IdP SSO endpoint', ALL_SETTINGS.get('SAML_IDP_SSO_URL'), optionalUrl)
}

// Prompt for the SAML entity identifier of the service.
async function promptForSamlSpEntityId() {
  console.info(`


The SAML entity identifier (entityID) for the Helix Authentication Service.
This value may be defined by the SAML identity provider (e.g. Azure). It is
important that this value matches exactly what is configured in the identity
provider, as it uniquely identifies the service application.

`)
  await promptFor('SAML_SP_ENTITY_ID', 'Enter the SAML entity ID for service', ALL_SETTINGS.get('SAML_SP_ENTITY_ID'))
}

// Prompt for which protocol to configure as the default.
async function promptForDefaultProtocol() {
  console.info(`


You have chosen to configure multiple protocols. Some client applications
may not indicate which protocol they want to use, and the service will need
to have a default protocol configured in that case.

Accepted values are 'oidc' and 'saml'.

`)
  await promptFor('DEFAULT_PROTOCOL', 'Enter the default protocol', ALL_SETTINGS.get('DEFAULT_PROTOCOL'), validateProtocol)
}

// Prompt for authentication inputs.
async function promptForAuthInputs() {
  await promptForProtocols()
  if (PROTOCOLS['oidc']) {
    await promptForOidcIssuerUri()
    await promptForOidcClientId()
    await promptForOidcClientSecret()
  }
  if (PROTOCOLS['saml']) {
    await promptForSamlIdpMetadataUrl()
    await promptForSamlIdpSsoUrl()
    await promptForSamlSpEntityId()
  }
  // ensure correct default protocol (if read from file)
  const defproto = ALL_SETTINGS.get('DEFAULT_PROTOCOL')
  if (defproto) {
    if (defproto !== 'oidc' && defproto !== 'saml') {
      await promptForDefaultProtocol()
    }
  }
  // If configuring multiple protocols, or if they appear to configuring one
  // protocol that is not the default protocol configured previously, then
  // prompt them for the new default.
  if (PROTOCOLS.length > 1) {
    await promptForDefaultProtocol()
  } else if (defproto == 'saml' && PROTOCOLS['oidc']) {
    await promptForDefaultProtocol()
  } else if (defproto == 'oidc' && PROTOCOLS['saml']) {
    await promptForDefaultProtocol()
  }
}

// Prompt for the P4PORT of the Helix Core server.
async function promptForP4port() {
  return promptFor('P4PORT', 'Enter the P4PORT of the Helix server', ALL_SETTINGS.get('P4PORT'), validateP4port)
}

// Prompt for the name of the Perforce super user.
async function promptForP4user() {
  return promptFor('P4USER', 'Enter the username of the super user', ALL_SETTINGS.get('P4USER'), validateP4user)
}

// Prompt for the password of the Perforce super user.
async function promptForP4passwd() {
  return promptForPassword('P4PASSWD', 'Enter the password of the super user', ALL_SETTINGS.get('P4PASSWD'))
}

// Prompt for the HTTP Bearer token.
async function promptForBearerToken() {
  console.info(`


The SCIM cloud service provider will authenticate using an HTTP Bearer
token. This same value must be provided to the cloud service provider,
typically in base64-encoded form.

`)
  return promptFor('BEARER_TOKEN', 'Enter the bearer token', ALL_SETTINGS.get('BEARER_TOKEN'), validateNotEmpty)
}

// Prompt for user provisioning inputs.
async function promptForScimInputs() {
  console.info(`

The user provisioning feature will need the Helix Core Server address
and credentials for a super user that can manage users and groups.

`)
  await promptForP4port()
  while ((await checkHelixServer()) !== 0) {
    await promptForP4port()
  }
  await promptForP4user()
  await promptForP4passwd()
  while ((await checkSuperUser()) !== 0) {
    await promptForP4user()
    // Clear the password so prompt_for_password will behave as if no password
    // has yet been provided (which is partially true).
    ALL_SETTINGS.set('P4PASSWD', '')
    await promptForP4passwd()
  }
  await promptForBearerToken()
}

// Prompt for some or all of the necessary inputs.
async function promptForInputs() {
  await promptForSvcBaseUri()
  await promptForWebAdmin()
  if (ALL_SETTINGS.get('ADMIN_ENABLED') === 'yes') {
    await promptForAdminCreds()
  } else {
    // configuring authentication, provisioning, or both?
    await promptForFeatures()
    if (CONFIGURE_SCIM) {
      await promptForScimInputs()
    }
    if (CONFIGURE_AUTH) {
      await promptForAuthInputs()
    }
  }
}

async function checkHelixServer() {
  const P4PORT = ALL_SETTINGS.get('P4PORT')
  if (!P4PORT) {
    error('No P4PORT specified')
    return 1
  }
  const pparts = P4PORT.split(':')
  if (pparts[0].match(/^ssl/)) {
    await invokeP4(['trust', '-f', '-y'])
    INJECT_P4TRUST = true
  }

  try {
    const p4info = await invokeP4(['-ztag', 'info'])
    const lines = p4info.split(/\r?\n/)
    const serverVersion = lines.find((e) => e.startsWith('... serverVersion'))
    const vparts = serverVersion.split(' ')
    const pieces = vparts[2].split('/')
    const p4d_rel = pieces[2]
    const p4d_change = pieces[3]
    if (P4D_MIN_VERSION.localeCompare(p4d_rel, undefined, { numeric: true }) > 0 ||
      (P4D_MIN_CHANGE.localeCompare(p4d_change, undefined, { numeric: true })) > 0) {
      error(`This Helix server ${p4d_rel}/${p4d_change} is not supported by Auth Extension.`)
      error(`Auth Extension supports Helix servers starting with [${P4D_MIN_VERSION}]/[${P4D_MIN_CHANGE}]`)
      return 1
    }
    return 0
  } catch (err) {
    error(`Unable to connect to Helix server [${P4PORT}]`)
    error(err.message)
    return 1
  }
}

// Ensure the user credentials provided are valid and confer super access.
async function checkSuperUser() {
  const P4PORT = ALL_SETTINGS.get('P4PORT')
  const P4USER = ALL_SETTINGS.get('P4USER')
  if (!P4PORT || !P4USER) {
    error('No P4PORT or P4USER specified')
    return 1
  }
  const P4PASSWD = ALL_SETTINGS.get('P4PASSWD')
  if (P4PASSWD.trim().length === 0) {
    console.info('P4PASSWD is empty or is whitespace. Skipping Helix server login.')
  } else if (P4PASSWD.match(/[A-Za-z0-9]/) && P4PASSWD.length === 32) {
    // the password appears to be a ticket value, check the login status
    try {
      await invokeP4(['login', '-s'])
    } catch (err) {
      error('Existing super user ticket has expired, please enter the credentials again.')
      return 1
    }
  } else {
    try {
      await invokeP4(['login'], P4PASSWD)
    } catch (err) {
      error(`Unable to login to Helix server '${P4PORT}' as '${P4USER}' with supplied password`)
      return 1
    }
    const output = await invokeP4(['login', '-p'], P4PASSWD)
    // first line is 'Enter password:' and second line is ticket value
    const p4passwd = output.split(/\r?\n/)[1]
    ALL_SETTINGS.set('P4PASSWD', p4passwd)
  }
  const protects = await invokeP4(['protects', '-m'])
  if (protects.trim() !== 'super') {
    error(`User '${P4USER}' must have super privileges`)
    return 1
  }
  return 0
}

function validateAdminCreds() {
  if (!ALL_SETTINGS.has('ADMIN_USERNAME') || ALL_SETTINGS.get('ADMIN_USERNAME') === '') {
    error('An administrative username must be provided.')
    return 1
  }
  if (!ALL_SETTINGS.has('ADMIN_PASSWD') || ALL_SETTINGS.get('ADMIN_PASSWD') === '') {
    error('An administrative password must be provided.')
    return 1
  }
  return 0
}

// Validate inputs for the authentication integration.
function validateAuthInputs() {
  //
  // Validate OIDC/SAML settings only if the user chose to provide those
  // settings during this particular run of the script (i.e. they may be
  // running the script a second time and choosing to switch protocols).
  //
  const hasOidcClientId = ALL_SETTINGS.has('OIDC_CLIENT_ID')
  const hasSamlIdpSsoUrl = ALL_SETTINGS.has('SAML_IDP_SSO_URL')
  const hasSamlIdpMetadataUrl = ALL_SETTINGS.has('SAML_IDP_METADATA_URL')
  if (PROTOCOLS['oidc']) {
    const hasOidcIssuerUri = ALL_SETTINGS.has('OIDC_ISSUER_URI')
    if (!hasOidcIssuerUri && !hasSamlIdpSsoUrl && !hasSamlIdpMetadataUrl) {
      error('Either OIDC or SAML identity provider settings must be provided.')
      return 1
    }
    const hasOidcClientSecret = ALL_SETTINGS.has('OIDC_CLIENT_SECRET')
    if (hasOidcIssuerUri) {
      if (!hasOidcClientId) {
        error('An OIDC client identifier must be provided.')
        return 1
      }
      if (!hasOidcClientSecret) {
        error('An OIDC client secret must be provided.')
        return 1
      }
    }
  }
  if (PROTOCOLS['saml']) {
    const samlIdpSsoUrl = ALL_SETTINGS.get('SAML_IDP_SSO_URL')
    if (samlIdpSsoUrl && validateUrl(samlIdpSsoUrl) !== 0) {
      error('A valid SAML IdP SSO URL must be provided.')
      return 1
    }
    const samlIdpMetadataUrl = ALL_SETTINGS.get('SAML_IDP_METADATA_URL')
    if (samlIdpMetadataUrl && validateUrl(samlIdpMetadataUrl) !== 0) {
      error('A valid SAML IdP metadata URL must be provided.')
      return 1
    }
  }
  if (ALL_SETTINGS.has('DEFAULT_PROTOCOL')) {
    const defaultProtocol = ALL_SETTINGS.get('DEFAULT_PROTOCOL')
    if (defaultProtocol !== 'oidc' && defaultProtocol !== 'saml') {
      error('Default protocol must be either OIDC or SAML.')
      return 1
    }
    if (defaultProtocol === 'oidc' && !hasOidcClientId) {
      error('Must configure OIDC if using it as the default protocol.')
      return 1
    }
    if (defaultProtocol === 'saml' && !hasSamlIdpSsoUrl && !hasSamlIdpMetadataUrl) {
      error('Must configure SAML if using it as the default protocol.')
      return 1
    }
  }
  return 0
}

// Validate inputs for the user provisioning feature.
async function validateScimInputs() {
  if (validateP4port(ALL_SETTINGS.get('P4PORT')) !== 0) {
    return 1
  }
  if ((await checkHelixServer()) !== 0) {
    return 1
  }
  if (validateP4user(ALL_SETTINGS.get('P4USER')) !== 0) {
    return 1
  }
  if ((await checkSuperUser()) !== 0) {
    return 1
  }
  return 0
}

// Return 0 if all provided inputs are valid, 1 otherwise.
async function validateInputs() {
  if (validateUrl(ALL_SETTINGS.get('SVC_BASE_URI')) !== 0) {
    error('A valid base URL for the service must be provided.')
    return 1
  }
  if (ALL_SETTINGS.get('ADMIN_ENABLED') == 'yes') {
    return validateAdminCreds()
  } else {
    if (CONFIGURE_AUTH && validateAuthInputs() !== 0) {
      return 1
    }
    if (CONFIGURE_SCIM && (await validateScimInputs() !== 0)) {
      return 1
    }
  }
  return 0
}

// Validate the given argument is not empty, returning 0 if okay, 1 otherwise.
function validateNotEmpty(value) {
  if (value === null || value === '') {
    errorPrompt('Please enter a value.')
    return 1
  }
  return 0
}

// Validate the given argument as a URL, returning 0 if okay, 1 otherwise.
function validateUrl(url) {
  if (url.match(new RegExp('^https?://.+')) === null) {
    errorPrompt('Please enter a valid URL.')
    return 1
  }
  return 0
}

// Validate the given argument as a URL, if not blank.
function optionalUrl(url) {
  if (url.length > 0 && !url.match(new RegExp('^https?://.+'))) {
    errorPrompt('Please enter a valid URL.')
    return 1
  }
  return 0
}

// Validate the given argument as an HTTPS URL.
function validateHttpsUrl(url) {
  if (url.length === 0 || !url.match(new RegExp('^https://.+'))) {
    errorPrompt('Please enter a valid HTTPS URL.')
    return 1
  }
  return 0
}

// Validate the selected default protocol(either 'saml' or 'oidc').
function validateProtocol(protocol) {
  if (protocol === 'oidc' || protocol === 'saml') {
    return 0
  }
  error('Enter either "oidc" or "saml" for default protocol.')
  return 1
}

// Validate first argument represents a valid P4PORT value.
function validateP4port(p4port) {
  const PROTOS = 'tcp tcp4 tcp6 tcp46 tcp64 ssl ssl4 ssl6 ssl46 ssl64'.split(' ')
  let PROTO = ''
  let PNUM = ''

  // extract the port number, if any
  // local BITS=(${PORT//:/ })
  const BITS = p4port.split(':')
  if (BITS.length === 1) {
    PNUM = BITS[0]
  } else if (BITS.length === 2) {
    if (PROTOS.includes(BITS[0])) {
      PROTO = BITS[0]
    }
    PNUM = BITS[1]
  } else if (BITS.length === 3) {
    PROTO = BITS[0]
    PNUM = BITS[2]
  } else {
    error(`Too many parts in P4PORT: ${p4port}`)
    return 1
  }
  if (PROTO && !PROTOS.includes(PROTO)) {
    error(`Invalid Helix protocol: ${PROTO}`)
    return 1
  }
  if (isNaN(parseInt(PNUM))) {
    error(`Port number must be numeric: ${PNUM}`)
    return 1
  }
  return 0
}

// Validate first argument represents a valid Perforce username.
function validateP4user(p4user) {
  if (p4user === '' || !p4user.match(/^[a-zA-Z]+/)) {
    error('Username must start with a letter.')
    return 1
  }
  return 0
}

// Normalize the user inputs.
function cleanInputs() {
  // prune empty, null, or undefined settings
  ALL_SETTINGS.forEach((value, key, map) => {
    if (value === undefined || value === null || value === '') {
      map.delete(key)
    }
  })
  if (ALL_SETTINGS.has('SVC_BASE_URI')) {
    // trim trailing slashes from base URI
    ALL_SETTINGS.set('SVC_BASE_URI', ALL_SETTINGS.get('SVC_BASE_URI').replace(/\/$/, ''))
  }
  const SAML_IDP_SSO_URL = ALL_SETTINGS.get('SAML_IDP_SSO_URL')
  const SAML_IDP_METADATA_URL = ALL_SETTINGS.get('SAML_IDP_METADATA_URL')
  if (SAML_IDP_SSO_URL || SAML_IDP_METADATA_URL) {
    // set a default value for SAML_SP_ENTITY_ID
    const SAML_SP_ENTITY_ID = ALL_SETTINGS.get('SAML_SP_ENTITY_ID')
    if (!SAML_SP_ENTITY_ID) {
      ALL_SETTINGS.set('SAML_SP_ENTITY_ID', ALL_SETTINGS.get('SVC_BASE_URI'))
    }
  }
  if (ALL_SETTINGS.get('ADMIN_ENABLED') === 'yes') {
    ALL_SETTINGS.set('ADMIN_ENABLED', 'true')
  } else {
    ALL_SETTINGS.delete('ADMIN_ENABLED')
    ALL_SETTINGS.delete('ADMIN_USERNAME')
    ALL_SETTINGS.delete('ADMIN_PASSWD_FILE')
  }
  if (!ALL_SETTINGS.has('P4PORT')) {
    // if P4PORT is not set, then none of the other P4-related settings will
    // have any meaning at all, remove them completely
    ALL_SETTINGS.delete('P4USER')
    ALL_SETTINGS.delete('P4TICKETS')
    ALL_SETTINGS.delete('P4TRUST')
  }
}

// Print what this script will do.
function printPreamble() {
  const isDefined = (name) => {
    return ALL_SETTINGS.has(name)
  }
  const value = (name) => {
    return ALL_SETTINGS.get(name)
  }
  console.info(`

The script is ready to make the configuration changes.

The operations involved are as follows:

`)
  console.info(`  * Set SVC_BASE_URI to ${value('SVC_BASE_URI')}`)
  if (isDefined('ADMIN_USERNAME')) {
    console.info('  * Enable the administrative web interface')
    console.info(`  * Set ADMIN_USERNAME to ${value('ADMIN_USERNAME')}`)
  }
  if (isDefined('ADMIN_PASSWD')) {
    console.info(`  * Set ADMIN_PASSWD_FILE to ${value('ADMIN_PASSWD_FILE')}`)
    console.info('    (the file will contain the admin user password)')
  }
  if (isDefined('OIDC_ISSUER_URI')) {
    console.info(`  * Set OIDC_ISSUER_URI to ${value('OIDC_ISSUER_URI')}`)
  }
  if (isDefined('OIDC_CLIENT_ID')) {
    console.info(`  * Set OIDC_CLIENT_ID to ${value('OIDC_CLIENT_ID')}`)
  }
  if (isDefined('OIDC_CLIENT_SECRET')) {
    console.info(`  * Set OIDC_CLIENT_SECRET_FILE to ${value('OIDC_CLIENT_SECRET_FILE')}`)
    console.info('    (the file will contain the client secret)')
  }
  if (isDefined('SAML_IDP_METADATA_URL')) {
    console.info(`  * Set SAML_IDP_METADATA_URL to ${value('SAML_IDP_METADATA_URL')}`)
  }
  if (isDefined('SAML_IDP_SSO_URL')) {
    console.info(`  * Set SAML_IDP_SSO_URL to ${value('SAML_IDP_SSO_URL')}`)
  }
  if (isDefined('SAML_SP_ENTITY_ID')) {
    console.info(`  * Set SAML_SP_ENTITY_ID to ${value('SAML_SP_ENTITY_ID')}`)
  }
  if (isDefined('DEFAULT_PROTOCOL')) {
    console.info(`  * Set DEFAULT_PROTOCOL to ${value('DEFAULT_PROTOCOL')}`)
  }
  if (isDefined('P4PORT')) {
    console.info(`  * Set P4PORT to ${value('P4PORT')}`)
  }
  if (isDefined('P4USER')) {
    console.info(`  * Set P4USER to ${value('P4USER')}`)
  }
  if (isDefined('P4PASSWD')) {
    console.info('  * Set P4PASSWD to (hidden)')
  }
  if (isDefined('BEARER_TOKEN')) {
    console.info(`  * Set BEARER_TOKEN_FILE to ${value('BEARER_TOKEN_FILE')}`)
    console.info('    (the file will contain the bearer token)')
  }
  console.info('\nThe service will then be restarted.\n')
}

// Prompt user to proceed with or cancel the configuration.
async function promptToProceed() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  let answer
  do {
    answer = await rl.question('Do you wish to continue (yes/no)? ')
  } while (answer !== 'yes' && answer !== 'y' && answer !== 'no' && answer !== 'n')
  rl.close()
  if (answer === 'n' || answer === 'no') {
    process.exit(1)
  }
}

async function modifyConfig() {
  //
  // Note that the fs.chmod() and fs.chown() calls probably have no effect at
  // all on Windows systems, but that may be acceptable for the time being.
  //
  const writeSettingToFile = async (settingName, fileSetting) => {
    const value = ALL_SETTINGS.get(settingName)
    const filename = ALL_SETTINGS.get(fileSetting)
    if (value && filename) {
      await fs.writeFile(filename, value)
      await fs.chmod(filename, '0600')
      const stats = await fs.stat('example.env')
      await fs.chown(filename, stats.uid, stats.gid)
      // remove the setting value from the configuration as only the file should
      // have the contents at this point
      ALL_SETTINGS.delete(settingName)
    } else if (filename) {
      // if not using a file-based setting, remove the file setting itself
      ALL_SETTINGS.delete(fileSetting)
    }
  }
  await writeSettingToFile('ADMIN_PASSWD', 'ADMIN_PASSWD_FILE')
  await writeSettingToFile('BEARER_TOKEN', 'BEARER_TOKEN_FILE')
  await writeSettingToFile('OIDC_CLIENT_SECRET', 'OIDC_CLIENT_SECRET_FILE')
  if (ALL_SETTINGS.has('P4PORT')) {
    // When running in systemd the service usually does not have a HOME and thus
    // will not generally be able to find the .p4tickets file.
    const HOME = process.env['USERPROFILE'] || process.env['HOME']
    if (!ALL_SETTINGS.has('P4TICKETS')) {
      ALL_SETTINGS.set('P4TICKETS', `${HOME}/.p4tickets`)
    }
    if (INJECT_P4TRUST) {
      // When running in systemd the service usually does not have a HOME and
      // thus will not generally be able to find the .p4trust file.
      if (!ALL_SETTINGS.has('P4TRUST')) {
        ALL_SETTINGS.set('P4TRUST', `${HOME}/.p4trust`)
      }
    }
  }

  // write all of the settings into either .env or config.toml
  if (CONFIG_FILE_NAME === 'config.toml') {
    const repository = new TomlSource({ tomlFile: 'config.toml' })
    await repository.write(ALL_SETTINGS)
  } else {
    const repository = new DotenvSource({ dotenvFile: '.env' })
    await repository.write(ALL_SETTINGS)
  }

  // Ensure the logging.config.cjs file is readable by all users to avoid
  // difficult to debug situations where the logging is not working and no
  // errors are displayed.
  await fs.chmod('logging.config.cjs', '0644')

  // ensure log file exists and is writable by the owner of example.env which is
  // assumed to be the user that installed the service
  if (!(await fileAccessible('auth-svc.log'))) {
    await fs.writeFile('auth-svc.log', '')
    const stats = await fs.stat('example.env')
    await fs.chown('auth-svc.log', stats.uid, stats.gid)
  }
}

// Restart the service for the configuration changes to take effect.
async function restartService() {
  if (process.platform === 'linux') {
    // Try stopping HAS using systemctl if the service unit is present.
    if (await fileAccessible('/etc/systemd/system/helix-auth.service')) {
      try {
        await invokeSystemctl(['stop', 'helix-auth'])
      } catch (err) {
        // ignore any errors as the service may not be running yet
      }
      await invokeSystemctl(['start', 'helix-auth'])
      SVC_RESTARTED = true
    }
  } else if (process.platform === 'win32') {
    let serviceAvailable = false
    try {
      const svcoutput = await invokeNetCmd(['start'])
      if (svcoutput.includes('Helix Authentication')) {
        serviceAvailable = true
      }
    } catch (err) {
      // ignore any errors, nothing we can do if this fails
    }
    if (serviceAvailable) {
      try {
        await invokeNetCmd(['stop', 'helixauthentication.exe'])
      } catch (err) {
        // ignore any errors as the service may not be running yet
      }
      await invokeNetCmd(['start', 'helixauthentication.exe'])
      SVC_RESTARTED = true
    }
  } else {
    console.info('WARNING: cannot restart service on unsupported system.')
  }
  return 0
}

// Print a summary of what was done and any next steps.
function printSummary() {
  console.info(`

==============================================================================
Automated configuration complete!

What was done:
  * The ${CONFIG_FILE_NAME} configuration file was updated.
  * Logging has been configured to write to auth-svc.log in this directory.`)
  if (SVC_RESTARTED) {
    console.info('  * The service was restarted.')
  }
  console.info('\nWhat should be done now:')
  if (!SVC_RESTARTED) {
    console.info('  * The service must be restarted for the changes to take effect.')
  }
  const SAML_IDP_SSO_URL = ALL_SETTINGS.get('SAML_IDP_SSO_URL')
  const SAML_IDP_METADATA_URL = ALL_SETTINGS.get('SAML_IDP_METADATA_URL')
  if (SAML_IDP_SSO_URL && !SAML_IDP_METADATA_URL) {
    console.info('  * Be sure to set IDP_CERT_FILE to the path of a file containing the')
    console.info('    public certificate of the SAML identity provider. This facilitates')
    console.info('    the verification of the SAML response, preventing MITM attacks.')
  }
  const BEARER_TOKEN = ALL_SETTINGS.get('BEARER_TOKEN')
  if (BEARER_TOKEN) {
    const BEARER_BASE64 = Buffer.from(BEARER_TOKEN, 'utf-8').toString('base64')
    console.info('  * Provide the BEARER_TOKEN value to the cloud service provider if')
    console.info('    using the SCIM user provisioning feature. The base64-encoded value')
    console.info(`    is ${BEARER_BASE64}`)
  }
  const SVC_BASE_URI = ALL_SETTINGS.get('SVC_BASE_URI')
  console.info(`  * If not already completed, the server and client certificates should be
    replaced with genuine certificates, replacing the self-signed certs.
    See the Administration Guide for additional information.
  * Visit the service in a browser to verify it is accessible:
        ${SVC_BASE_URI}`)
  if (ALL_SETTINGS.has('ADMIN_ENABLED')) {
    console.info(`
  * Visit the administrative web interface in a browser to finish the
    configuration of the service:
        ${SVC_BASE_URI}/admin
`)
  }
  console.info(`  * Consult the admin guide for other settings that may need to be changed
    in accordance with the configuration of the identity provider.
  * If using Helix Core server, be sure to install and configure the login
    extension that interoperates with the service to enable SSO authentication.
  * If using Helix ALM, be sure to configure the License Server to connect
    with the authentication service for enforcing access controls.

==============================================================================

`)
}

async function main() {
  // move to the base directory before anything else
  process.chdir(path.dirname(path.dirname(process.argv[1])))
  if (readArguments() !== 0) {
    process.exitCode = 1
  } else if ((await ensureReadiness()) !== 0) {
    process.exitCode = 1
  } else {
    await sourceP4settings()
    if (INTERACTIVE || DEBUG) {
      displayArguments()
    }
    await readSettings()
    let inputValidated = true
    if (INTERACTIVE) {
      displayInteractive()
      await promptForInputs()
      while ((await validateInputs()) !== 0) {
        await promptForInputs()
      }
    } else if ((await validateInputs()) !== 0) {
      process.exitCode = 1
      inputValidated = false
    }
    if (inputValidated) {
      cleanInputs()
      printPreamble()
      if (INTERACTIVE) {
        await promptToProceed()
      }
      await modifyConfig()
      await restartService()
      printSummary()
    }
  }
}

await main()
