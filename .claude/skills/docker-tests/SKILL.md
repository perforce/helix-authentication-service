---
name: docker-tests
description: >
  Start the Docker containers this service's integration tests depend on
  (Redis/Valkey, the OIDC and Shibboleth SAML IdPs, the JWT issuer, LDAP, and
  the auth-svc/HAProxy stack), then run the full test suite or a single
  Docker-dependent test file. Use when the user asks to run the full test
  suite (not `npm unit`/`UNIT_ONLY=true`), run integration tests, run a test
  that needs Redis/OIDC/SAML/Shibboleth/JWT, or start/stop the test
  containers described in containers/README.md.
argument-hint: "[full|<test-file-path>] [up|down]"
---

Some tests in this repo need the local `p4d` binary only (spawned directly by
`test/runner.js` — no Docker involved). Others need the Docker containers
defined in the root `docker-compose.yml` (documented in
`containers/README.md`). This skill is about the **Docker** half. See the
[containers/README.md](../../../containers/README.md) prerequisites section
before first use — DNS resolution for `*.doc` names has to work on the host,
which this skill checks but does not silently fix.

## 1. Check DNS resolution for `*.doc` names first

Every Docker-dependent test connects to containers by name (`redis.doc`,
`oidc.doc`, `shibboleth.doc`, `jwt.doc`, `authen.doc`, ...), which only
resolves to `127.0.0.1` if the host has dnsmasq + a `/etc/resolver/doc`
entry (macOS) or equivalent set up, per `containers/README.md`'s "Container
Name Resolution" section.

Check with:

```shell
dscacheutil -q host -a name authen.doc   # macOS
getent hosts authen.doc                  # Linux
```

If this fails to resolve to `127.0.0.1`, **stop and tell the user** — do not
run the `sudo` DNS setup commands from the README yourself. Point them at the
README's setup section (dnsmasq container + `/etc/resolver/doc` on macOS, or
the systemd-resolved instructions for Linux) and wait for confirmation it's
done, since this is a host-wide, sudo-gated change outside this repo. Also
remind them VPN clients like Cisco AnyConnect block local DNS resolvers.

## 2. Ensure the `auth-service` network exists

```shell
docker network inspect auth-service >/dev/null 2>&1 || docker network create auth-service
```

This is idempotent and safe to run every time; the network persists across
`docker compose down`.

## 3. Decide which containers you actually need

Building/starting the entire stack (auth-svc images, the .NET OIDC mock, the
Shibboleth image) is slow. If the user wants to run **one specific
Docker-dependent test file**, only start the services that file needs —
don't pay for the whole stack. Use this mapping (run from the repo root):

| Test file | Needs |
|---|---|
| `test/features/login/data/connectors/RedisConnector.test.js` | `redis.doc rediss.doc` |
| `test/features/login/data/repositories/RedisUserRepository.test.js` | `redis.doc rediss.doc` |
| `test/features/login/data/repositories/RedisRequestRepository.test.js` | `redis.doc rediss.doc` |
| `test/features/login/data/connectors/OpenIDConnector.test.js` | `oidc.doc shibboleth.doc` (shibboleth depends on `ldap.doc`, started automatically) |
| `test/features/login/data/connectors/SamlConnector.test.js` | `oidc.doc shibboleth.doc` |
| `test/features/login/domain/usecases/FetchSamlMetadata.test.js` | `shibboleth.doc` |
| `test/features/login/domain/usecases/GetSamlConfiguration.test.js` | `shibboleth.doc` |
| `test/features/login/domain/usecases/ValidateWebToken.test.js` | `jwt.doc` |
| `test/features/login/presentation/routes/oauth.test.js` | `jwt.doc` |
| `test/status.test.js` | `redis.doc rediss.doc oidc.doc shibboleth.doc` |
| `test/oidc.test.js` | full stack + Selenium/Firefox (see below) |
| `test/saml.test.js`, `test/one-step.test.js` | full stack + Selenium/Firefox |
| `test/features/scim/data/repositories/HelixEntityRepository.test.js` | **no Docker** — needs local `p4d` only |
| `test/features/admin/data/repositories/HelixCredentialsRepository.test.js` | **no Docker** — needs local `p4d` only |
| `test/scim.test.js` | **no Docker** — needs local `p4d` only |

`test/oidc.test.js`, `test/saml.test.js`, and `test/one-step.test.js` drive a
real browser via Selenium against `authen.doc`, which means the full stack
(`auth-svc1.doc`, `auth-svc2.doc`, `authen.doc`, `ldap.doc`, `oidc.doc`,
`shibboleth.doc`) has to be up, per the "full suite" path below.

If the file isn't in this table, `grep` it for `.doc` hostnames or
`REDIS_URL` to work out its dependencies before starting anything.

## 4. Start the containers

For a targeted subset (fast path):

```shell
docker compose up --build -d redis.doc rediss.doc   # example: just Redis/Valkey
```

For the full suite, follow `containers/README.md` exactly (from the repo
root, the parent of `containers/`):

```shell
docker compose build auth-svc1.doc
docker compose up --build -d
```

The first build is slow (compiles the auth-svc image, pulls/builds the .NET
OIDC mock and Shibboleth images) — expect several minutes on a cold cache.
Subsequent runs reuse the cache and are much faster.

## 5. Wait for readiness

`docker compose up -d` returns once containers are *started*, not
necessarily *healthy*. Poll before running tests:

```shell
docker compose ps --format '{{.Name}}: {{.Status}}'
```

Look for any `(unhealthy)` or `(health: starting)` entries and wait a few
seconds before retrying — `shibboleth.doc` in particular takes a bit to come
up, and `auth-svc1.doc`/`auth-svc2.doc` depend on it being healthy.

## 6. Run the tests

**Full suite:**

```shell
npm test
```

This already includes `--delay --exit` via the npm script — don't add flags.

**A single Docker-dependent test file** — this is the important gotcha:
check whether the file itself calls mocha's global `run()` near the bottom
(grep for `run()`; `test/scim.test.js` and
`test/features/login/presentation/routes/oauth.test.js` do this and say so
explicitly in a comment — "Tests must be run with `mocha --delay --exit`").

- **File calls `run()` itself** → include `--delay --exit`:
  ```shell
  npx mocha --delay --exit path/to/that.test.js
  ```
- **File does not call `run()`** (true for nearly everything else, including
  all the Redis/OIDC/SAML/JWT connector and use-case tests, and
  `HelixEntityRepository.test.js`) → **omit `--delay`**:
  ```shell
  npx mocha --exit path/to/the.test.js
  ```
  Passing `--delay` here is a silent footgun: mocha waits forever for a
  `run()` call that will never come, `--exit` then force-exits the process,
  and the result is **zero tests run with exit code 0** — indistinguishable
  from a passing run unless you notice the test count is 0. Always check the
  reporter output shows the tests you expected, not just a clean exit code.

Never set `UNIT_ONLY=true` for these runs — that env var makes every
Docker/`p4d`-dependent test skip itself via its `before()` hook, which is
the opposite of what you want here.

## 7. Tearing down

```shell
docker compose down
```

This stops and removes the containers but keeps the `auth-service` network
(so a later `docker compose up` doesn't need the network-create step again).
Only remove the network itself (`docker network rm auth-service`) if the
user explicitly asks to fully clean up — it may be shared with a
[helix-authentication-extension](https://github.com/perforce/helix-authentication-extension)
compose project doing manual testing against the same containers.
