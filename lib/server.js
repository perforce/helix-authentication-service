//
// Copyright 2020 Perforce Software
//
const assert = require('assert')
const fs = require('fs')
const http = require('http')
const https = require('https')
const path = require('path')
const url = require('url')
const glob = require('glob')
const minimatch = require('minimatch')
const container = require('@lib/container')
const logger = container.resolve('logger')

function getProtocol (env) {
  assert.ok(env, 'env must be defined')
  if (env.PROTOCOL) {
    // change the format to match that of url.URL()
    return env.PROTOCOL + ':'
  }
  if (env.SVC_BASE_URI) {
    const u = new url.URL(env.SVC_BASE_URI)
    return u.protocol
  }
  return 'http:'
}

function loadAuthorityCerts () {
  let files = []
  // Use node-glob to optionally load multiple CA certificate files.
  // c.f. https://github.com/isaacs/node-glob
  if (process.env.CA_CERT_FILE) {
    files = files.concat(glob.sync(process.env.CA_CERT_FILE))
  }
  if (process.env.CA_CERT_PATH) {
    const names = fs.readdirSync(process.env.CA_CERT_PATH)
    const paths = names.map(f => {
      return path.join(process.env.CA_CERT_PATH, f)
    })
    files = files.concat(paths)
  }
  if (files.length > 0) {
    const results = files.map(f => {
      const stats = fs.statSync(f)
      if (stats.isFile()) {
        logger.debug('reading CA file %s', f)
        return fs.readFileSync(f)
      }
      return null
    })
    return results.filter((v) => v !== null)
  }
  return undefined
}

// Create either an HTTP or HTTPS server based on environment.
function createServer (app) {
  const protocol = getProtocol(process.env)
  if (protocol === 'http:') {
    logger.debug('creating http server')
    return http.createServer(app)
  } else {
    // read the certificate authority file(s) if provided
    const ca = loadAuthorityCerts()
    const options = {
      key: fs.readFileSync(container.resolve('serviceKey')),
      cert: fs.readFileSync(container.resolve('serviceCert')),
      requestCert: true,
      rejectUnauthorized: false,
      ca
    }
    logger.debug('creating https server')
    return https.createServer(options, app)
  }
}

// Use PORT if it is defined, otherwise get the port from the SVC_BASE_URI,
// defaulting to 80 or 443 depending on the protocol. Otherwise, default to
// '3000' by convention.
function getPort (env) {
  assert.ok(env, 'env must be defined')
  if (env.PORT) {
    return env.PORT
  }
  if (env.SVC_BASE_URI) {
    const u = new url.URL(env.SVC_BASE_URI)
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
function normalizePort (val) {
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
function getServiceURI (env) {
  assert.ok(env, 'env must be defined')
  if (env.SVC_BASE_URI) {
    return env.SVC_BASE_URI
  }
  const port = getPort(env)
  const scheme = getProtocol(env)
  return `${scheme}//localhost:${port}`
}

// Retrieve the client certificate from the request, if the protocol is HTTPS.
// Returns null if the protocol is not HTTPS or the client did not provide a
// client certificate.
function getClientCert (req) {
  // Check for valid client certificates. This is set up in the options to
  // https.createServer(), namely the `ca`, `requestCert`, and
  // `rejectUnauthorized` properties. We then assert that the request is
  // authorized, and if not we give the client some explanation.
  if (req.protocol === 'https' && req.connection.getPeerCertificate) {
    return req.connection.getPeerCertificate()
  }
  return null
}

// If the request protocol is https and the provided cert is valid (including
// matching a pattern for approved subjects) then return true. If the protocol
// is http then assume the client is authorized.
function isClientAuthorized (req, cert, clientCertName) {
  let authorized = false
  if (req.protocol === 'https' && cert) {
    authorized = req.client.authorized
    if (clientCertName) {
      // additional check to ensure client cert subject matches a pattern
      authorized = cert && cert.subject && minimatch(cert.subject.CN, clientCertName)
    }
  } else if (req.protocol === 'http') {
    authorized = true
  }
  return authorized
}

function isSecure (env) {
  const protocol = getProtocol(env)
  return protocol === 'https:'
}

module.exports = {
  getClientCert,
  getPort,
  getServiceURI,
  isClientAuthorized,
  isSecure,
  normalizePort,
  createServer
}
