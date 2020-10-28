# Failover

This document is intended for developers who are interested in learning how to
modify and test the Helix Authentication Service. Be sure to start by reading
the `Development.md` document in this directory for the development setup.

## Design

The authentication service has two internal "repositories" for storing the login
request and user mapping. One is an in-memory store, using the `transitory` Node
package, and the other uses [redis](https://redis.io) to store the data via the
`redis` Node package. The logic for setting up the repositories is found in the
`lib/container.js` module.

Similarly, the Express.js session store will either use an in-memory store
(`memorystore`), or a Redis-backed store (`connect-redis`). The logic for
setting up the session store is found in the `lib/app.js` module.

For both the request/user mapping and the session store, the backing store is
chosen based on the presence of the `REDIS_URL` environment variable. If this
variable is defined, then the Redis-backed stores will be used, otherwise the
in-memory stores are used.

## Docker

For convenience, there is a container for Redis defined in the Compose file
(`docker-compose.yml`) named `redis.doc`, running on the default port (6379).
The HAS instances defined in the Compose file are configured to use the Redis
store for the request/user mapping and the session data.

## Testing

1. Start all docker containers: `docker-compose up --build -d`
1. Stop one of the HAS instances, either `auth-svc1.doc` or `auth-svc2.doc`
    * e.g. `docker-compose stop auth-svc1.doc`
1. Open https://auth-svc.doc/requests/new/foobar in a web browser
    * Firefox is very easy to use for this purpose
1. Click or copy/paste the `loginUrl` displayed in the browser
1. While the identity provider login page is displayed...
    * If you do not see the login page and instead are shown the success page,
      clear the browser's cached data and try again. With Firefox, usually
      exiting and launching again will be sufficient.
1. Stop the _other_ HAS instance that served the initial request
    * e.g. `docker-compose stop auth-svc2.doc`
1. Start the _first_ HAS instance that was stopped before the login began
    * e.g. `docker-compose start auth-svc1.doc`
1. In the browser, complete the identity provider login for the user

If you see the HAS login success page, then it worked.

What actually happened during this test? The login started with the only HAS
instance that was available, to which HAProxy directed the start of login
procedure. While the user was away from HAS, on the IdP login page, the initial
HAS instance was stopped and the other one was started. When the login result
came back from the IdP, it was directed to the new HAS instance (via HAProxy).
Because the session state and request/user mapping is stored in a separate
key/value store (Redis), the new HAS instance was able to complete the login
procedure. Without the external session store, HAS would only know about those
login requests that it had handled while the instance was running.
