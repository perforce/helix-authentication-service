//
// Copyright 2026 Perforce Software
//
import crypto from 'node:crypto'
import { SEPARATOR } from 'helix-auth-svc/lib/common/domain/usecases/HashPassword.js'

// Compare two strings in constant time to avoid leaking how many characters
// matched via timing differences. Both values are hashed to a fixed-length
// digest first so that crypto.timingSafeEqual() never sees differing lengths
// (which would otherwise throw and reveal the length of the expected value).
function constantTimeEqualStrings(a, b) {
  const aDigest = crypto.createHash('sha256').update(a).digest()
  const bDigest = crypto.createHash('sha256').update(b).digest()
  return crypto.timingSafeEqual(aDigest, bDigest)
}

/**
 * Verify a plaintext password against a value produced by HashPassword (a
 * salt and scrypt-derived key, hex-encoded and tab-separated), or, for
 * installations predating HAS-686, a plain plaintext password with no
 * separator -- regenerate the file (via configure-auth-service.js, or by
 * hand using HashPassword) to upgrade to the salted/hashed format.
 *
 * @param {String} plaintext - the password to verify.
 * @param {String} stored - the value read from the password file.
 * @return {boolean} true if plaintext matches, false otherwise.
 */
export default () => {
  return (plaintext, stored) => {
    const trimmed = String(stored).trim()
    const sepIndex = trimmed.indexOf(SEPARATOR)
    if (sepIndex === -1) {
      return constantTimeEqualStrings(String(plaintext), trimmed)
    }
    const saltHex = trimmed.slice(0, sepIndex)
    const hashHex = trimmed.slice(sepIndex + SEPARATOR.length)
    // Reject anything that isn't actually hex outright -- Buffer.from(...,
    // 'hex') silently stops at the first invalid character rather than
    // throwing, which for all-invalid input yields two zero-length buffers
    // that timingSafeEqual() considers trivially equal, bypassing the check.
    if (!/^[0-9a-f]+$/i.test(saltHex) || !/^[0-9a-f]+$/i.test(hashHex)) {
      return false
    }
    try {
      const salt = Buffer.from(saltHex, 'hex')
      const expected = Buffer.from(hashHex, 'hex')
      const actual = crypto.scryptSync(String(plaintext), salt, expected.length)
      return crypto.timingSafeEqual(actual, expected)
    } catch {
      return false
    }
  }
}
