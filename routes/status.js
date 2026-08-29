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
    const oidcProviders = providers.filter((elem) => 'issuerUri' in elem)
    const outcomes = await Promise.all(oidcProviders.map((elem) => status.validateOpenID(elem.issuerUri)))
    if (outcomes.length > 0) {
      const results = {}
      oidcProviders.forEach((elem, idx) => {
        results[elem.id] = outcomes[idx]
      })
      return results
    }
  }
  return 'not configured'
}

async function validateSaml() {
  const getAuthProviders = container.resolve('getAuthProviders')
  const providers = await getAuthProviders()
  if (providers) {
    const samlProviders = providers.filter((elem) => 'metadataUrl' in elem)
    const outcomes = await Promise.all(samlProviders.map((elem) => status.validateSaml(elem.metadataUrl)))
    if (outcomes.length > 0) {
      const results = {}
      samlProviders.forEach((elem, idx) => {
        results[elem.id] = outcomes[idx]
      })
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
