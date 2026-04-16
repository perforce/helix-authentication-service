# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Helix Auth Service (helix-auth-svc) is a Node.js/Express authentication protocol integration service for Perforce products. It supports OpenID Connect (OIDC) and SAML 2.0, includes a SCIM user provisioning endpoint, and a web-based admin interface. The service integrates with Helix Core (Perforce) via p4api.

## Commands

```bash
npm start           # Start the service (entry: bin/www.js)
npm test            # All tests (requires Docker — runs docker-compose services)
npm unit            # Unit tests only (no Docker required)
npm licenses        # Check dependency licenses

# Run a single test file
npx mocha --exit --delay test/features/login/domain/usecases/SomeUseCase.test.js
```

## Architecture

The codebase follows **Clean Architecture** with three feature modules under `lib/features/`:

- **admin** — web admin UI and REST API for managing OIDC/SAML providers, credentials, and tokens
- **login** — OIDC and SAML 2.0 authentication flows (passport, openid-client, node-saml)
- **scim** — SCIM 2.0 user/group provisioning, backed by Helix Core

Each feature has three layers:
```
features/<name>/
├── data/
│   ├── connectors/    # External connections (Redis, etc.)
│   └── repositories/  # Data access implementations
├── domain/
│   ├── entities/      # Domain models
│   └── usecases/      # Business logic (one class per use case)
└── presentation/
    └── routes/        # Express route handlers
```

Shared infrastructure lives in `lib/common/` (settings repository, config sources).

**Entry points:**
- `bin/www.js` — bootstraps the DI container, creates the Express app, and starts the HTTP/S server
- `lib/container.js` — Awilix DI container registering all repositories and use cases
- `lib/app.js` — Express app factory (middleware, sessions, route registration)

## Dependency Injection

All services are wired via [Awilix](https://github.com/jeffijoe/awilix). Every use case and repository receives its dependencies through constructor destructuring:

```js
export default ({ settingsRepository, requestRepository }) => {
  // ...
}
```

When adding a new use case or repository, register it in `lib/container.js`.

## Configuration

Configuration is layered and merged in priority order (highest first):
1. Environment variables
2. `config.toml`
3. `.env` (dotenv)
4. Defaults

`lib/common/data/repositories/MergedSettingsRepository.js` handles merging. See `example.toml` for the full reference configuration.

## Storage Backends

- **Sessions/request state**: Redis (production) or in-memory (memorystore/lokijs for development/test). Configured via `REDIS_URL` or Redis Sentinel settings.
- `UNIT_ONLY=true` env var skips Docker-dependent tests that require Redis and external IdPs.

## ES Modules

The project uses `"type": "module"` (ESM). All imports use the full path or the package name (`helix-auth-svc/lib/...`). There is no TypeScript — plain JavaScript throughout.

## Tests

Tests mirror the `lib/` directory structure under `test/`. Integration tests use `docker-compose.yml` to spin up Redis, Keycloak, and Shibboleth containers. The `test/packages/` directory contains lightweight mock IdP servers used in integration tests.

## Code Style

ESLint is configured via `eslint.config.mjs` (flat config) with the `eslint-plugin-unicorn` plugin. The `node:` protocol is required for Node built-ins (e.g., `import fs from 'node:fs'`).
