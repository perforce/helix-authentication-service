[![Support](https://img.shields.io/badge/Support-Official-green.svg)](mailto:support@perforce.com)

# Helix Authentication Service

This [Node.js](http://nodejs.org) based application implements a simple
authentication protocol integration service that may be used in concert with
systems wanting to permit users to authenticate with external identity systems.
It currently supports the OpenID Connect and SAML 2.0 authentication protocols.

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

This design lends itself well to integrating other authentication protocols,
including custom schemes developed by authentication providers such as
[Auth0](http://auth0.com/) -- just add `passport-auth0` as a Node dependency,
add a new route to the service, and configure the extension to use the new
protocol.

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

### Node.js Version Support

The `master` branch of this repository requires Node.js v12, the Long Term
Support release. To use the service with Node.js v10 requires checking out the
`node10` branch. That branch is provided for those situations where Node v12 is
not available, as with CentOS/RHEL 6, and upgrading the OS is not feasible. The
drawback is that the version of the `openid-client` module that supports Node
v10 does not have the features and bug fixes of the more recent releases.
Support for Node v10 is temporary and will likely be removed in the future.

## Documentation

See the product documentation in the [docs](./docs) directory.

## How to Get Help

Configuring the extension, the authentication service, and the identity provider
is a non-trivial task. Some expertise with security systems is helpful. In the
event that you need assistance with configuring these systems, please contact
[Perforce Support](https://www.perforce.com/support/request-support).

## Development

See the [development](./docs/Development.md) page for additional information
regarding building and testing the service. For a description of the overall
design of the application, see the [Design.md](./docs/Design.md) page.
