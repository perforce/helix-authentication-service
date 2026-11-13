//
// Copyright 2026 Perforce Software
//

//
// Defines the interface for recording which SAML assertions have already been
// accepted, so that each assertion can be used only once (HAS-734).
//
// Entries need only be kept until the assertion expires, after which it would
// be rejected anyway.
//
class AssertionRepository {
  /**
   * Record the assertion as consumed, atomically.
   *
   * @param {String} assertionId - unique identifier of the assertion.
   * @param {Number} expiresAt - time (ms since epoch) after which the
   *                             assertion is no longer valid.
   * @return {Promise<Boolean>} true if this is the first use of the
   *                            assertion, false if already consumed.
   */
  // eslint-disable-next-line no-unused-vars
  consume (assertionId, expiresAt) {
    return Promise.reject(new Error('not implemented'))
  }
}

export { AssertionRepository }
