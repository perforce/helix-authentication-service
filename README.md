[![Support](https://img.shields.io/badge/Support-Official-green.svg)](mailto:support@perforce.com)

# Helix Authentication Service

This [Node.js](http://nodejs.org) based application implements a simple
authentication protocol integration service that may be used in concert with
systems wanting to permit users to authenticate with external identity systems.
It currently supports the OpenID Connect and SAML 2.0 authentication protocols.

## Versions

Official releases will have version numbers of the form `YYYY.N`, such as
`2019.1`, `2020.1`, or `2020.2`. These releases have undergone testing and are
available on the Perforce FTP and package server.

Patch releases will have version numbers with three dot separated numbers, such
as `2020.1.1` or `2019.1.2`.

The unofficial "snapshot" releases will have versions with additional numbers,
`YYYY.N.N.NNNNNN`, where the patch and snapshot numbers are appended to the last
major release. These may include changes that are not yet reflected in the
documentation, and these versions are limited to Community Support.

## Overview

### Architecture

The service itself is a simple Node.js web application that leverages several
open source libraries to interact with standards-based authentication providers.
This can be installed and run anywhere on the network, as long as it is
reachable from any clients that will be using this service.

When an end user attempts to access a configured system, that system will direct
the user to the authentication service using their default web browser. From
there the service will redirect to the configured identity provider (IdP), where
the user will authenticate. Upon successful authentication, the system that
initiated the login request will receive the validated user profile, at which
point the system can give access to the user.

### Supported Products

The authentication service provides integration support for other applications,
including Helix Core Server, Helix ALM, and Surround SCM. See the documentation
section below for additional prerequisites and installation details.

### Provider Support

The authentication service has been tested with the following identity providers:

| Provider                              | OIDC | SAML |
| ------------------------------------- | ---- | ---- |
| [Auth0](https://auth0.com)            | OK   | OK   |
| [Azure](https://azure.microsoft.com)  | OK   | OK   |
| [Okta](https://www.okta.com)          | OK   | OK   |
| [OneLogin](https://www.onelogin.com)  | OK   | OK   |
| [Ping](https://www.pingidentity.com/) | OK   | OK   |
| [Shibboleth](https://www.shibboleth.net) | N/A | OK |

## Documentation

See the product documentation on the Perforce [website](https://www.perforce.com/manuals/helix-auth-svc/) for the latest released version. Older versions of the administrator guide can be found in the [docs](./docs) directory.

## How to Get Help

Configuring the extension, the authentication service, and the identity provider
is a non-trivial task. Some expertise with security systems is helpful. In the
event that you need assistance with configuring these systems, please contact
[Perforce Support](https://www.perforce.com/support/request-support).

## Development

See the [development](./docs/Development.md) page for additional information
regarding building and testing the service. For a description of the overall
design of the application, see the [Design.md](./docs/Design.md) page.
