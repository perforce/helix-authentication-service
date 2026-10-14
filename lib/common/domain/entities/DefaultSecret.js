//
// Copyright 2026 Perforce Software
//

// The well-known placeholder value historically shipped in defaults.env,
// example.env, and example.toml for secrets such as BEARER_TOKEN. Code that
// reads a configured secret should treat this value the same as unset,
// since it is public and must never be trusted as a real credential.
export const DEFAULT_SECRET = 'keyboard cat'
