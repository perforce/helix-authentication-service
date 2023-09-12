//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'
import * as url from 'node:url'
import { minimatch } from 'minimatch'
import nodeForge from 'node-forge'
import { RequestError } from 'helix-auth-svc/lib/common/domain/errors/RequestError.js'
const { asn1, md, pki } = nodeForge

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
    if (settingsRepository.get('ASSUME_CLIENT_AUTHORIZED')) {
      return true
    }
    if (settingsRepository.get('CLIENT_CERT_HEADER')) {
      // This approach differs from the solution below that relies on Node.js to
      // validate the client cert in that it only checks either the subject or
      // fingerprint of the cert. Typically the frontend load balancer will do
      // some basic validation of the client certificate.
      const pem = req.get(settingsRepository.get('CLIENT_CERT_HEADER'))
      if (pem) {
        const { subjectCN, delimitedFP } = extractCNandFP(pem)
        return validateNameOrFP(settingsRepository, subjectCN, delimitedFP)
      }
    } else {
      if (!configuredSecure(settingsRepository)) {
        // If the service is not configured to use HTTPS then it is impossible to
        // get the peer certificate from Node, so assume the client is authorized.
        return true
      }
      const cert = getPeerCertificate(req)
      // the returned cert will be {} if nothing was sent
      if (cert && Object.entries(cert).length) {
        if (req.client.authorized) {
          return validateNameOrFP(settingsRepository, cert.subject?.CN, cert.fingerprint256)
        }
        const msg = `client certificate is not authorized`
        throw new RequestError(msg, 403)
      }
    }
    throw new RequestError('client certificate required', 401)
  }
}

function getPeerCertificate(req) {
  // n.b. this function is only available when the connection is secure
  if (req.connection.getPeerCertificate) {
    return req.connection.getPeerCertificate()
  }
  return null
}

// Return `true` if the serivce is configured for HTTPS, `false` otherwise.
function configuredSecure(settings) {
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

// Return { subjectCN, delimitedFP } from the given PEM encoded cert. Throws a
// `400` request error if processing fails.
function extractCNandFP(pem) {
  try {
    const cert = pki.certificateFromPem(prepareHeaderValue(pem))
    const subjectCN = cert.subject.getField('CN').value
    const asAsn1 = pki.certificateToAsn1(cert)
    const asDerBytes = asn1.toDer(asAsn1).getBytes()
    const fingerPrint = md.sha256.create().update(asDerBytes).digest().toHex()
    // inject colons to match what Node.js would return
    const delimitedFP = fingerPrint.match(/.{2}/g).join(':')
    return { subjectCN, delimitedFP }
  } catch (err) {
    throw new RequestError(err.message, 400)
  }
}

// Either returns true or throws an exception.
function validateNameOrFP(settingsRepository, subjectCN, fingerprint) {
  const clientCN = settingsRepository.get('CLIENT_CERT_CN')
  const clientFP = settingsRepository.get('CLIENT_CERT_FP')
  if (clientCN) {
    if (compareCommonName(clientCN, subjectCN)) {
      return true
    } else {
      const msg = `client certificate ${subjectCN} is not permitted`
      throw new RequestError(msg, 403)
    }
  } else if (clientFP) {
    if (compareFingerprint(clientFP, fingerprint)) {
      return true
    } else {
      const msg = `client certificate does not match fingerprint`
      throw new RequestError(msg, 403)
    }
  }
  return true
}

function compareFingerprint(expected, actual) {
  expected = expected.toUpperCase()
  actual = actual.toUpperCase()
  if (expected.includes(',')) {
    const values = expected.replace(/[ "'[\]]/g, '').split(',').map((c) => c.trim()).filter((c) => c.length)
    for (const entry of values) {
      if (actual === entry) {
        return true
      }
    }
    return false
  }
  return actual === expected
}

function compareCommonName(expected, actual) {
  if (expected.includes(',')) {
    const values = expected.replace(/[ "'[\]]/g, '').split(',').map((c) => c.trim()).filter((c) => c.length)
    for (const entry of values) {
      if (minimatch(actual, entry)) {
        return true
      }
    }
    return false
  }
  if (minimatch(actual, expected)) {
    return true
  }
  return false
}

// Prepare the raw client certificate header value into something that the third
// party library can process.
function prepareHeaderValue(pem) {
  // nginx ingress controller in k8s will URI encode the value and include the
  // text armor (?) while Azure App Service does not include the armor
  const decoded = pem.includes('%20') || pem.includes('%0A') ? decodeURI(pem) : pem
  if (decoded.includes('-----BEGIN CERTIFICATE-----')) {
    return decoded
  }
  return `-----BEGIN CERTIFICATE-----${decoded}-----END CERTIFICATE-----`
}
