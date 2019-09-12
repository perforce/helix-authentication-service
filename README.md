# Perforce Authentication Service

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

## Documentation

See the corresponding product documentation for details.
