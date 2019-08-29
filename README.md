# Perforce Authentication Service

This [Node.js](http://nodejs.org) based application implements a simple
authentication protocol integration service that may be used in concert with
systems wanting to permit users to authenticate with external identity systems.
It supports the OpenID Connect and SAML 2.0 authentication protocols. While the
service includes a Helix Server extension to facilitate SSO authentication, it
could be used by other products via it's RESTful interface, as the service
itself has no direct link to Helix Server.

## Overview

### Architecture

The service itself is a simple Node.js web application that leverages several
open source libraries to interact with standards-based authentication providers.
This can be installed and run anywhere on the network, as long as it is
reachable from the Helix Server and any clients that will be using this service.
The other half of the system, albeit a very small half, is the server extension
installed on Helix Server, which acts as a mediator between the service and the
server. When a Perforce user attempts to log in to the server, the extension
will cause their web browser to open to the authentication provider, and
meanwhile poll the service to get the authentication status. Once the user has
successfully authenticated with the provider, the extension will get the results
and signal the server to issue a ticket.

This design lends itself well to integrating other authentication protocols,
including custom schemes developed by authentication providers such as
[Auth0](http://auth0.com/) -- just add `passport-auth0` as a Node dependency, add
a new route to the service, and configure the extension to use the new protocol.

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

See the files in the `docs` directory, especially the `Getting_Started.md` guide
that gives a detailed overview of setting up everything.
