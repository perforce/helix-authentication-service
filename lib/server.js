//
// Copyright 2020-2023 Perforce Software
//
import * as fs from 'node:fs'
import * as http from 'node:http'
import * as https from 'node:https'
import * as url from 'node:url'
import container from 'helix-auth-svc/lib/container.js'
const logger = container.resolve('logger')
const loadAuthorityCerts = container.resolve('loadAuthorityCerts')

function getScheme (settings) {
  const protocol = settings.get('PROTOCOL')
  if (protocol) {
    // change the format to match that of url.URL()
    return protocol + ':'
  }
  const baseuri = settings.get('SVC_BASE_URI')
  if (baseuri) {
    const u = new url.URL(baseuri)
    return u.protocol
  }
  return 'http:'
}

export function loadPassPhrase (settings) {
  const keypassphrasefile = settings.get('KEY_PASSPHRASE_FILE')
  if (keypassphrasefile) {
    return fs.readFileSync(keypassphrasefile, 'utf8').trim()
  }
  return settings.get('KEY_PASSPHRASE')
}

// Create either an HTTP or HTTPS server based on environment.
export function createServer (app, settings) {
  const protocol = getScheme(settings)
  if (protocol === 'http:') {
    logger.debug('creating http server')
    return http.createServer(app)
  } else {
    // read the certificate authority file(s) if provided
    const ca = tryLoadAuthorityCerts(settings)
    const serviceCert = settings.get('CERT_FILE')
    const serviceKey = settings.get('KEY_FILE')
    const options = {
      key: fs.readFileSync(serviceKey),
      cert: fs.readFileSync(serviceCert),
      passphrase: loadPassPhrase(settings),
      requestCert: true,
      rejectUnauthorized: false,
      ca
    }
    const pfxfile = settings.get('PFX_FILE')
    if (pfxfile) {
      // If using a PKCS#12 (.pfx) file for the server certificate, then remove
      // the key and cert properties which will always have default values, and
      // let the pfx property take precedence.
      logger.debug('using PKCS#12 certificate %s', pfxfile)
      options.pfx = fs.readFileSync(pfxfile)
      delete options.key
      delete options.cert
    }
    logger.debug('creating https server')
    return https.createServer(options, app)
  }
}

function tryLoadAuthorityCerts(settings) {
  try {
    return loadAuthorityCerts(settings)
  } catch (err) {
    logger.error('failed to load authority certs: %s', err.message)
    logger.error('Check CA_CERT_FILE/CA_CERT_PATH to ensure file/directory exists.')
    process.exit(1)
  }
}

// Use PORT if it is defined, otherwise get the port from the SVC_BASE_URI,
// defaulting to 80 or 443 depending on the protocol. Otherwise, default to
// '3000' by convention.
export function getPort (settings) {
  const port = settings.get('PORT')
  if (port) {
    return port
  }
  const baseuri = settings.get('SVC_BASE_URI')
  if (baseuri) {
    const u = new url.URL(baseuri)
    if (u.port) {
      return u.port
    }
    if (u.protocol === 'https:') {
      return '443'
    } else if (u.protocol === 'http:') {
      return '80'
    }
    throw new Error('protocol must be http: or https:')
  }
  return '3000'
}

// Normalize a port into a number, string, or false.
export function normalizePort (val) {
  const port = parseInt(val, 10)

  if (isNaN(port)) {
    // named pipe
    return val
  }

  if (port >= 0) {
    // port number
    return port
  }

  return false
}

// Retrieve the configured service URI or construct a sensible default.
export function getServiceURI (settings) {
  const baseuri = settings.get('SVC_BASE_URI')
  if (baseuri) {
    return baseuri.replace(/\/$/, '')
  }
  const port = getPort(settings)
  const scheme = getScheme(settings)
  return `${scheme}//localhost:${port}`
}
