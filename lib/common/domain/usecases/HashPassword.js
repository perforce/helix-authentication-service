//
// Copyright 2026 Perforce Software
//
import crypto from 'node:crypto'

// scrypt parameters: 16-byte salt, 64-byte derived key, matching Node's own
// documented scrypt example and OWASP's password storage guidance. Node's
// built-in scrypt is used instead of a third-party module such as argon2 to
// avoid native-binding packaging concerns across the platforms this service
// ships to (HAS-686).
const SALT_BYTES = 16
const KEY_BYTES = 64
// Separates the salt from the derived key in the stored value. A tab cannot
// appear in either hex-encoded half, and is vanishingly unlikely to appear in
// a legacy plaintext password file from before HAS-686, which VerifyPassword
// relies on to distinguish the two formats.
const SEPARATOR = '\t'

/**
 * Hash a plaintext password with a fresh random salt, suitable for storing at
 * rest (e.g. in the file named by ADMIN_PASSWD_FILE).
 *
 * @param {String} plaintext - the password to hash.
 * @return {String} salt and derived key, hex-encoded and tab-separated.
 */
export default () => {
  return (plaintext) => {
    const salt = crypto.randomBytes(SALT_BYTES)
    const hash = crypto.scryptSync(String(plaintext), salt, KEY_BYTES)
    return `${salt.toString('hex')}${SEPARATOR}${hash.toString('hex')}`
  }
}

export { SEPARATOR }
