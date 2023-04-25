//
// Copyright 2023 Perforce Software
//
import * as assert from 'node:assert'
import * as fs from 'node:fs/promises'
import { parse } from 'helix-auth-svc/lib/features/login/data/parsers/SwarmConfigParser.js'

/**
 * Validate a Swarm configuration by comparing the details in the saml section
 * with the settings in the service.
 *
 * @param {String} config - Swarm configuration file contents.
 * @return {Object} results of validation.
 * @throws {Error} if validation fails for any reason.
 */
export default ({ settingsRepository, getIdPConfiguration }) => {
  assert.ok(settingsRepository, 'settingsRepository must be defined')
  assert.ok(getIdPConfiguration, 'getIdPConfiguration must be defined')
  return async (serviceURI, config) => {
    assert.ok(serviceURI, 'validate-swarm: serviceURI must be defined')
    assert.ok(config, 'validate-swarm: config must be defined')
    const retval = {}
    try {
      const parsed = parse(config)
      retval.results = await validate({ parsed, getIdPConfiguration, settingsRepository, serviceURI })
      retval.errors = []
    } catch (err) {
      retval.results = []
      retval.errors = [err.message]
    }
    if (retval.errors.length) {
      retval.status = 'errors'
    } else if (retval.results.length) {
      retval.status = 'results'
    } else {
      retval.status = 'ok'
    }
    return retval
  }
}

async function validate({ parsed, getIdPConfiguration, settingsRepository, serviceURI }) {
  const errors = []
  try {
    const spEntityId = getSetting(parsed, ['saml', 'sp', 'entityId'])
    const acsUrl = getSetting(parsed, ['saml', 'sp', 'assertionConsumerService', 'url'])
    const idpEntityId = getSetting(parsed, ['saml', 'idp', 'entityId'])
    const ssoUrl = getSetting(parsed, ['saml', 'idp', 'singleSignOnService', 'url'])
    const x509cert = getSetting(parsed, ['saml', 'idp', 'x509cert']).trim()
    const idpConfig = await getIdPConfiguration()
    if (spEntityId in idpConfig) {
      const spConfig = idpConfig[spEntityId]
      // When validating the ACS URL we must remove the typical suffix that
      // Swarm adds dynamically to the value given in the configuration.
      if ('acsUrl' in spConfig) {
        const expectedAcsUrl = spConfig['acsUrl']
        if (!expectedAcsUrl.startsWith(acsUrl)) {
          const cleanUrl = cleanSwarmUrl(expectedAcsUrl)
          errors.push(`saml.sp.assertionConsumerService.url must be ${cleanUrl}`)
        }
      } else if ('acsUrlRe' in spConfig) {
        // assume that the regex ends with the usual Swarm suffix
        const expectedRegex = cleanSwarmUrl(spConfig['acsUrlRe'])
        if (acsUrl.match(expectedRegex) === null) {
          const cleanUrl = cleanSwarmUrl(expectedRegex)
          errors.push(`saml.sp.assertionConsumerService.url must match ${cleanUrl}`)
        }
      } else if ('acsUrls' in spConfig) {
        const expectedUrls = spConfig['acsUrls']
        let found = false
        for (const expectedAcsUrl of expectedUrls) {
          if (expectedAcsUrl.startsWith(acsUrl)) {
            found = true
            break
          }
        }
        if (!found) {
          const cleanUrls = expectedUrls.map((e) => cleanSwarmUrl(e))
          errors.push(`saml.sp.assertionConsumerService.url must be one of ${cleanUrls}`)
        }
      } else {
        errors.push(`IDP_CONFIG_FILE entry for ${spEntityId} is missing 'acsUrl' or 'acsUrls'`)
      }
      if (idpEntityId !== 'urn:auth-service:idp') {
        errors.push('saml.idp.entityId must be `urn:auth-service:idp`')
      }
      const expectedSsoUrl = `${serviceURI}/saml/sso`
      if (ssoUrl !== expectedSsoUrl) {
        errors.push(`saml.idp.singleSignOnService.url must be ${expectedSsoUrl}`)
      }
      const serviceCert = settingsRepository.get('CERT_FILE')
      const cert = await fs.readFile(serviceCert, 'utf8')
      if (cert.trim() !== x509cert.trim()) {
        errors.push('saml.idp.x509cert does not match contents of CERT_FILE')
      }
    } else {
      errors.push(`saml.sp.entityId (${spEntityId}) is missing in IDP_CONFIG_FILE`)
    }
  } catch (err) {
    errors.push(err.message)
  }
  return errors
}

// Dig into the parsed configuration to find the setting by the given path.
// Throws an error if any part of the path is missing from the configuration.
function getSetting(config, names) {
  const result = names.reduce((acc, name) => {
    const path = acc.path === null ? name : acc.path + '.' + name
    if (acc.value.has(name)) {
      return { path, value: acc.value.get(name) }
    } else {
      throw new Error(`missing '${path}' in configuration`)
    }
  }, { value: config, path: null })
  return result.value
}

function cleanSwarmUrl(acsUrl) {
  if (acsUrl.endsWith('/api/v10/session')) {
    return acsUrl.substring(0, acsUrl.length - 16)
  }
  return acsUrl
}
