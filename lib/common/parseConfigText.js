//
// Copyright 2026 Perforce Software
//
import JSON5 from 'json5'

/**
 * Parse the text of a configuration setting (e.g. IDP_CONFIG, LOGGING,
 * SENTINEL_CONFIG) into an object.
 *
 * The configuration is a JavaScript object literal, historically wrapped in a
 * CommonJS (module.exports = ...) or ES module (export default ...)
 * assignment. Parse it as data with JSON5 rather than evaluating it as code;
 * evaluation allows arbitrary code execution for anyone who can edit these
 * admin-editable settings (HAS-678, HAS-731). JSON5 accepts the same relaxed
 * syntax (comments, single quotes, unquoted keys, trailing commas) used by
 * existing configuration files, so this remains backward compatible with the
 * legacy module format.
 *
 * @param {String} contents - text of the configuration.
 * @return {Object} the parsed configuration.
 * @throws {SyntaxError} if the text is not a valid object literal.
 */
export function parseConfigText(contents) {
  const unwrapped = contents
    .replace(/module\.exports\s*=/, '')
    .replace(/export\s+default/, '')
    .replace(/;\s*$/, '')
  return JSON5.parse(unwrapped)
}
