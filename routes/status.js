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

async function validateOpenID () {
  const issuerUri = settings.get('OIDC_ISSUER_URI')
  if (issuerUri) {
    return status.validateOpenID(issuerUri)
  }
  const getAuthProviders = container.resolve('getAuthProviders')
  const providers = await getAuthProviders()
  if (providers) {
    const results = {}
    for (const elem of providers) {
      if ('issuerUri' in elem) {
        const result = await status.validateOpenID(elem.issuerUri)
        results[elem.label] = result
      }
    }
    return results
  } else {
    return 'not configured'
  }
}

async function validateSaml () {
  const metadataUrl = settings.get('SAML_IDP_METADATA_URL')
  if (metadataUrl) {
    return await status.validateSaml(metadataUrl)
  }
  const getAuthProviders = container.resolve('getAuthProviders')
  const providers = await getAuthProviders()
  if (providers) {
    const results = {}
    for (const elem of providers) {
      if ('metadataUrl' in elem) {
        const result = await status.validateSaml(elem.metadataUrl)
        results[elem.label] = result
      }
    }
    return results
  } else {
    return 'not configured'
  }
}

async function validateCert () {
  const passphrase = loadPassPhrase(settings)
  const pfxfile = settings.get('PFX_FILE')
  if (pfxfile) {
    return status.validatePfxFile(pfxfile, passphrase)
  }
  const serviceCert = container.resolve('serviceCert')
  const serviceKey = container.resolve('serviceKey')
  return status.validateServerCert(serviceCert, serviceKey, passphrase)
}

export default router
