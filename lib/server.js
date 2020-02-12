//
// Copyright 2020 Perforce Software
//
const fs = require('fs')
const http = require('http')
const https = require('https')
const path = require('path')
const url = require('url')
const glob = require('glob')
const logger = require('../lib/logging')

function getProtocol () {
  if (process.env.PROTOCOL) {
    // change the format to match that of url.URL()
    return process.env.PROTOCOL + ':'
  }
  const u = new url.URL(process.env.SVC_BASE_URI)
  return u.protocol
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
    })
    return results
  }
  return undefined
}

/**
 * Create either an HTTP or HTTPS server based on environment.
 */
function createServer (app) {
  const protocol = getProtocol()
  if (protocol === 'http:') {
    logger.debug('creating http server')
    return http.createServer(app)
  } else {
    if (process.env.SP_KEY_FILE && process.env.SP_CERT_FILE) {
      // read the certificate authority file(s) if provided
      const ca = loadAuthorityCerts()
      const options = {
        key: fs.readFileSync(process.env.SP_KEY_FILE),
        cert: fs.readFileSync(process.env.SP_CERT_FILE),
        requestCert: true,
        rejectUnauthorized: false,
        ca
      }
      logger.debug('creating https server')
      return https.createServer(options, app)
    } else {
      logger.error('missing required environment variables: SP_KEY_FILE, SP_CERT_FILE')
      process.exit()
    }
  }
}

module.exports = {
  createServer
}
