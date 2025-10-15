# NGINX and Provisioning

## Overview

The [Docker](https://www.docker.com) containers defined in `docker-compose.yml`
provide an example of an instance of P4AS that serves as a backend to NGINX,
which is configured as a reverse proxy. The reverse proxy performs several
functions:

1. Terminates the TLS connection to offload that work from the auth service.
1. Sets the `X-Forwarded-*` headers in order for P4AS to set secure cookies.
1. Passes the `Authorization` header through to P4AS for the `/scim/v2` route.

## Purpose

The purpose of this example is to demonstrate using a reverse proxy to receive
requests from the public internet while keeping the authentication service
hidden behind a firewall. When P4AS is acting as a SCIM endpoint for the purpose
of user and group provisioning, it must be accessible from the public internet,
as well as have the `p4` client binary and `.p4tickets` and `.p4trust` files in
order for P4AS to interact with Helix Core Server. By using a firewall to prevent
direct access to P4AS the risk of inappropriate access to Helix Core Server is
reduced.

## Testing

The docker containers have names that end with `.doc` to enable the use of
dnsmasq for resolving the names of the containers. See the `README.md` file in
the `containers` directory for details.

Start by building the containers:

```shell
$ docker compose up --build -d
```

Then use `curl` to query the provisioned users via the proxy:

```shell
$ curl -k --oauth2-bearer a2V5Ym9hcmQgY2F0 https://authen.doc/scim/v2/Users
{"schemas":["urn:ietf:params:scim:api:messages:2.0:ListResponse"],"totalResults":0,"Resources":[]}
```

Note that `a2V5Ym9hcmQgY2F0` is the base64 encoded form of the bearer token,
`keyboard cat`, as defined in the P4AS environment (`BEARER_TOKEN`).
