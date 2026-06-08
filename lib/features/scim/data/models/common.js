//
// Copyright 2021 Perforce Software
//
import * as assert from 'node:assert'

// Validate that a Perforce user or group name is safe to use as a p4 command
// argument. The p4api library builds command lines by splitting the command
// string on spaces (honoring double quotes and backslash escapes), and p4
// itself treats any argument beginning with a hyphen as a flag. A name that
// contains whitespace, double quotes, or backslashes could be split into
// multiple arguments, and a name beginning with a hyphen could be interpreted
// as a flag, either of which would inject additional p4 arguments. (HAS-685)
export function assertValidName (name, noun = 'name') {
  assert.ok(typeof name === 'string' && name.length > 0, `${noun} must not be empty`)
  assert.doesNotMatch(name, /[\s"\\]/, `${noun} must not contain whitespace, quotes, or backslashes`)
  assert.doesNotMatch(name, /^-/, `${noun} must not begin with a hyphen`)
}

// Deep clone object, lowercasing all of the property names.
//
// RFC 7643 defines attribute names as being case-insensitive, which is counter
// to JavaScript's handling of object properties.
export function lowerClone (orig) {
  const cloned = {}
  Object.keys(orig).forEach((key) => {
    if (Array.isArray(orig[key]) || typeof orig[key] !== 'object') {
      cloned[key.toLowerCase()] = orig[key]
    } else {
      cloned[key.toLowerCase()] = lowerClone(orig[key])
    }
  })
  return cloned
}
