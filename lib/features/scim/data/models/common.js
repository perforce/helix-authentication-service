//
// Copyright 2021 Perforce Software
//

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
