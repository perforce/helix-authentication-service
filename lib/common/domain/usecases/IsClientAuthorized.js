//
// Copyright 2022 Perforce Software
//
import * as assert from 'node:assert'
import * as url from 'node:url'
import minimatch from 'minimatch'
import { RequestError } from 'helix-auth-svc/lib/common/domain/errors/RequestError.js'

/**
 * Determine if the request represents an authorized client. If the service is
 * not configured for HTTPS then the client is assumed to be authorized.
 *
 * @param {Object} req - Node.js HTTP request object.
 * @return {boolean} always returns true, otherwise throws an error.
 * @throws {Error} if validation fails for any reason.
 */
export default ({ settingsRepository }) => {
  assert.ok(settingsRepository, 'settingsRepository must be defined')
  return (req) => {
    assert.ok(req, 'is-authorized: req must be defined')
    if (!configuredSecure(settingsRepository)) {
      // If the service is not configured to use HTTPS then it is assumed that
      // client certificates will not be available from Node.
      return true
    }
    if (settingsRepository.get('ASSUME_CLIENT_AUTHORIZED')) {
      return true
    }
    const cert = getPeerCertificate(req)
    // the returned cert will be {} if nothing was sent
    if (cert && Object.entries(cert).length) {
      if (req.client.authorized) {
        const clientCN = settingsRepository.get('CLIENT_CERT_CN')
        const clientFP = settingsRepository.get('CLIENT_CERT_FP')
        if (clientCN) {
          if (compareCommonName(cert, clientCN)) {
            return true
          } else {
            const msg = `client certificate ${cert.subject.CN} is not permitted`
            throw new RequestError(msg, 403)
          }
        } else if (clientFP) {
          if (compareFingerprint(cert, clientFP)) {
            return true
          } else {
            const msg = `client certificate does not match fingerprint`
            throw new RequestError(msg, 403)
          }
        } else {
          return true
        }
      }
      const msg = `client certificate is not authorized`
      throw new RequestError(msg, 403)
    }
    throw new RequestError('client certificate required', 401)
  }
}

function getPeerCertificate (req) {
  // n.b. this function is only available when the connection is secure
  if (req.connection.getPeerCertificate) {
    return req.connection.getPeerCertificate()
  }
  return null
}

// Return `true` if the serivce is configured for HTTPS, `false` otherwise.
function configuredSecure (settings) {
  // Determine if the service is configured to use HTTPS rather than HTTP.
  // Simply relying on the `protocol` property of the request object is not
  // helpful since Express.js will set the protocol according to the request
  // headers coming from the reverse proxy when configured with `trust proxy`.
  // Same for the `secure` property.
  const protocol = settings.get('PROTOCOL')
  if (protocol) {
    return protocol === 'https'
  }
  const baseuri = settings.get('SVC_BASE_URI')
  if (baseuri) {
    const u = new url.URL(baseuri)
    return u.protocol === 'https:'
  }
  return false
}

function compareFingerprint (cert, value) {
  if (value.includes(',')) {
    const values = value.replace(/[ "'[\]]/g, '').split(',').map((c) => c.trim()).filter((c) => c.length)
    for (const entry of values) {
      if (cert.fingerprint256 === entry) {
        return true
      }
    }
    return false
  }
  return cert.fingerprint256 === value
}

function compareCommonName (cert, value) {
  if (value.includes(',')) {
    const values = value.replace(/[ "'[\]]/g, '').split(',').map((c) => c.trim()).filter((c) => c.length)
    for (const entry of values) {
      if (cert.subject && minimatch(cert.subject.CN, entry)) {
        return true
      }
    }
    return false
  }
  if (cert.subject && minimatch(cert.subject.CN, value)) {
    return true
  }
}