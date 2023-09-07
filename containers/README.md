# HAS Docker Containers

This document describes a setup for testing the authentication service using [Docker](https://www.docker.com), which is relatively easy to use, but comes with the cavaet that you will need to work through some complicated setup for container name resolution. Be sure to read through this entire document before attempting to use these containers.

## Overview

This directory contains definitions for several Docker containers for testing the authentication service.

* **auth-svc:** the authentication service itself.
* **haproxy:** HAProxy for load balancing between two instances of HAS.
* **ldap:** OpenLDAP directory which serves as the user data source to Shibboleth.
* **oidc:** IdentityServer4 for OpenID Connect authentication.
* **redis:** Redis server with TLS enabled and configured to expect client certificates.
* **shibboleth:** Shibboleth for SAML 2.0 authentication.

The `docker-compose.yml` file in the parent directory configures those containers, plus one additional container for [Redis](https://redis.io), which supports failover of the service.

* `authen.doc`: load balancer in front of authentication service instances
* `auth-svc1.doc`: authentication service listening on port `3001`
* `auth-svc2.doc`: authentication service listening on port `3002`
* `jwt.doc`: simplistic service for issuing and validating JSON web tokens
* `ldap.doc`: OpenLDAP to which Shibboleth delegates user authentication
* `oidc.doc`: OpenID Connect identity provider
* `redis.doc`: Redis instance for failover of the authentication service instances
* `rediss.doc`: Redis (with TLS) for failover of the authentication service instances
* `shibboleth.doc`: SAML 2.0 identity provider

The only piece of information that is needed for the client application (e.g. Helix Core with the `loginhook` extension and Swarm) is the URL to the load balancer: https://authen.doc

How does the client application, and likewise the desktop browser connect to these containers? See the next section for the setup, and in particular the container name resolution.

## Setup

1. [Install](https://docs.docker.com/engine/install/) Docker
1. [Install](https://docs.docker.com/compose/install/) Docker Compose

Supported platforms include Linux, macOS, and Windows. Supported Linux distributions include CentOS, Debian, Fedora, and Ubuntu.

### Container Name Resolution

The Docker containers have names that are used internally to find each other, and since several of the containers are serving requests from the web browser, the names must be resolvable by the system doing the testing. In order for the test system to resolve these names, it may be helpful to install [dnsmasq](http://www.thekelleys.org.uk/dnsmasq/doc.html). The easiest way to run dnsmasq is via Docker.

```shell
$ echo 'address=/.doc/127.0.0.1' | sudo tee /etc/dnsmasq.conf
$ docker run --name dnsmasq -d -p 53:53/udp -p 5380:8080 \
    -v /etc/dnsmasq.conf:/etc/dnsmasq.conf \
    --log-opt 'max-size=1m'  -e 'HTTP_USER=admin' -e 'HTTP_PASS=admin' \
    --restart always jpillora/dnsmasq
```

If using a **macOS** system, the commands below will configure the host to use dnsmasq for host name resolution:

```shell
$ sudo mkdir /etc/resolver
$ echo 'nameserver 127.0.0.1' | sudo tee /etc/resolver/doc
$ scutil --dns | grep doc
```

The output of the `scutil --dns` command should show the resolver for the `doc` domain.

If using a systemd-based **Linux** desktop, this [page](https://sixfeetup.com/blog/local-development-with-wildcard-dns-on-linux) describes the steps for running dnsmasq and `systemd-resolved` together. Note that this only works for the desktop system itself, if you want other hosts to be able to use this system for DNS, you will need to disable the stub listener for `systemd-resolved` and rely directly on dnsmasq.

An alternative to using dnsmasq would be to hard-code the names in the `/etc/hosts` file, or configure a DNS server to resolve the names.

#### DNS and VPN

Note that VPN software such as Cisco AnyConnect will block any attempts to use a local DNS resolver, so you will need to disconnect from VPN when using a local name resolver.

## Usage

Build and start the containers (from the parent directory) like so:

```shell
$ docker compose build auth-svc1.doc
$ docker compose up --build -d
```

To test authentication, open https://authen.doc/requests/new/foobar in a browser and copy the `loginUrl` value into the browser location bar. If using Firefox, you can click on the `loginUrl` directly. Either way, opening the login URL will direct the browser to the IdP of the default protocol (`saml` in the default docker configuration).

### User Accounts

Testing the authentication with the accounts defined below is easy enough, as described in the [Usage](#usage) section. To be truly useful however, you will want to create accounts for these users in Helix Core Server (or ALM License Server), and test authentication with that system. 

* OIDC
    - username `janedoe`, password `Passw0rd!`, email `janedoe@example.com`
    - username `johndoe`, password `Passw0rd!`, email `johndoe@example.com`
* Shibboleth
    - username `george`, password `Passw0rd!`, email `george@example.org`
    - username `sampson`, password `Passw0rd!`, email `sampson@example.org`
    - username `jackson`, password `Passw0rd!`, email `saml.jackson@example.com`
    - username `janedoe`, password `Passw0rd!`, email `janedoe@example.com`
    - username `johndoe`, password `Passw0rd!`, email `johndoe@example.com`

The OIDC user accounts are defined in `../docker-compose.yml`, while the Shibboleth accounts are defined via LDAP in the `ldap/dd-entries.ldif` file.

For an example Docker setup with Helix Core Server and Swarm, see the `containers` directory in the https://github.com/perforce/helix-authentication-extension project.

## Limitations

This setup only tests OpenID Connect with the included container `oidc`, and SAML 2.0 with the included container `shibboleth`. To test other identity providers, it is necessary to change the configuration in the `docker-compose.yml` file in the parent directory and rebuild the containers.

As an example, changing the `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, and `OIDC_ISSUER_URI` settings in the `auth-svc1.doc` and `auth-svc2.doc` containers to refer to an external OIDC IdP, and configuring that IdP to route to `https://authen.doc/oidc/callback`, should work.

Note that after changing settings in the docker containers, you must rebuild and start them:

```shell
$ docker compose up --build -d
```
