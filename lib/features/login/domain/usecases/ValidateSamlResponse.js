//
// Copyright 2022 Perforce Software
//
import * as assert from 'node:assert'
import { SAML } from '@node-saml/node-saml'
import { findMatchingEntry } from 'helix-auth-svc/lib/features/login/domain/usecases/ValidateSamlRequest.js'

/**
 * Validate the SAML assertion received from the client application. The `body`
 * should contain a single property named `SAMLResponse` that comes from the
 * HTTP request sent to the service.
 *
 * In addition to the signature and timestamps, the assertion must be intended
 * for one of the service providers in the IdP configuration, and each
 * assertion is accepted only once, so that a captured response cannot be
 * replayed (HAS-734).
 *
 * @param {Object} options - SAML IdP options used to validate the assertion.
 * @param {String} body - HTTP requset body that contains the SAML assertion.
 * @return {Object} contains the user `profile` and the original `requestId`.
 * @throws {Error} if validation fails for any reason.
 */
export default ({ getIdPConfiguration, assertionRepository }) => {
  assert.ok(getIdPConfiguration, 'validate-saml-resp: getIdPConfiguration must be defined')
  assert.ok(assertionRepository, 'validate-saml-resp: assertionRepository must be defined')
  return async (options, body) => {
    assert.ok(options, 'validate-saml-resp: options must be defined')
    assert.ok(body, 'validate-saml-resp: body must be defined')
    // The expected audience depends on which service provider the response
    // was issued for, which node-saml cannot check against a list (or glob
    // patterns), so the audience is checked below instead.
    const saml = new SAML({ ...options, audience: false })
    const { profile } = await saml.validatePostResponseAsync(body)
    const assertion = profile.getAssertion().Assertion
    const conditions = assertion.Conditions ? assertion.Conditions[0] : null
    const idpConfig = await getIdPConfiguration()
    const audiences = getAudiences(conditions)
    if (!audiences.some((audience) => findMatchingEntry(audience, idpConfig))) {
      throw new Error(`SAML assertion audience not permitted: ${audiences.join(', ')}`)
    }
    const assertionId = assertion.$ && assertion.$.ID
    const expiresAt = conditions && conditions.$ ? Date.parse(conditions.$.NotOnOrAfter) : NaN
    if (!assertionId || Number.isNaN(expiresAt)) {
      throw new Error('SAML assertion is missing ID or NotOnOrAfter')
    }
    if (!await assertionRepository.consume(assertionId, expiresAt)) {
      throw new Error('SAML assertion has already been used')
    }
    // profile will contain nameID and sessionIndex
    return {
      profile,
      requestId: profile.sessionIndex
    }
  }
}

// Return all of the audience values from the assertion conditions.
function getAudiences(conditions) {
  const audiences = []
  const restrictions = (conditions && conditions.AudienceRestriction) || []
  for (const restriction of restrictions) {
    for (const audience of restriction.Audience || []) {
      if (audience && audience._) {
        audiences.push(audience._)
      }
    }
  }
  return audiences
}
