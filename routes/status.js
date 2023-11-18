//
// Copyright 2022 Perforce Software
//
import express from 'express'
import container from 'helix-auth-svc/lib/container.js'
import { loadPassPhrase } from 'helix-auth-svc/lib/server.js'
import * as status from 'helix-auth-svc/lib/status.js'
const settings = container.resolve('settingsRepository')
const router = express.Router()

// eslint-disable-next-line no-unused-vars
router.get('/', async (req, res, next) => {
  try {
    const caCertFile = settings.get('CA_CERT_FILE')
    const ca = await status.validateCertAuth(caCertFile)
    const cert = await validateCert()
    const oidc = await validateOpenID()
    const entityRepository = container.resolve('entityRepository')
    const perforce = await status.validatePerforce(entityRepository)
    const redisConnector = container.resolve('redisConnector')
    const redis = await status.validateRedis(redisConnector)
    const saml = await validateSaml()
    const version = await status.getVersion()
    const uptime = process.uptime()
    const overall = status.summarize([ca, cert, oidc, perforce, redis, saml])
    res.json({
      status: overall,
      ca, cert, oidc, perforce, redis, saml, uptime,
      versions: process.versions,
      app_version: version
    })
  } catch (err) {
    // when all else fails
    res.json({ status: err.toString() })
  }
})

async function validateOpenID() {
  const getAuthProviders = container.resolve('getAuthProviders')
  const providers = await getAuthProviders()
  if (providers) {
    const results = {}
    for (const elem of providers) {
      if ('issuerUri' in elem) {
        const result = await status.validateOpenID(elem.issuerUri)
        results[elem.id] = result
      }
    }
    if (Object.keys(results).length > 0) {
      return results
    }
  }
  return 'not configured'
}

async function validateSaml() {
  const getAuthProviders = container.resolve('getAuthProviders')
  const providers = await getAuthProviders()
  if (providers) {
    const results = {}
    for (const elem of providers) {
      if ('metadataUrl' in elem) {
        const result = await status.validateSaml(elem.metadataUrl)
        results[elem.id] = result
      }
    }
    if (Object.keys(results).length > 0) {
      return results
    }
  }
  return 'not configured'
}

async function validateCert() {
  const passphrase = loadPassPhrase(settings)
  const pfxfile = settings.get('PFX_FILE')
  if (pfxfile) {
    return status.validatePfxFile(pfxfile, passphrase)
  }
  const serviceCert = settings.get('CERT_FILE')
  const serviceKey = settings.get('KEY_FILE')
  return status.validateServerCert(serviceCert, serviceKey, passphrase)
}

export default router
