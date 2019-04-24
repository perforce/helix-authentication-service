# Perforce Authentication Service

This [Node.js](http://nodejs.org) based application implements a simple external
authentication service to be used in concert with the `loginhook` extension. It
supports the OpenID Connect and SAML 2.0 authentication protocols, as well as
BIND authentication with an LDAP server. While the service includes a Helix
Server extension to facilitate SSO authentication, it could be used by other
products via it's RESTful interface, as the service itself has no direct link to
Helix Server.

## Overview

### Architecture

The service itself is a simple Node.js web application that leverages several
open source libraries to interact with standards-based authentication providers.
This can be installed and run anywhere on the network, as long as it is
reachable from the Helix Server and any clients that will be using this service.
The other half of the system, albeit a very small half, is the Perforce
extension installed on the Helix Server, which acts as a mediator between the
service and the server. When a Perforce user attempts to log in to the server,
the extension will cause their web browser to open to the authentication
provider, and meanwhile poll the service to get the authentication success
status. Once the user has successfully authenticated with the provider, the
extension will get the results and signal the server to issue a ticket (or not,
and fail the login).

This design lends itself well to integrating other authentication protocols,
including custom schemes developed by authentication providers such as
[Auth0](http://auth0.com/) -- just add `passport-auth0` as a Node dependency, add
a new route to the service, and configure the extension to use the new protocol.
Of course, if they support OIDC or SAML, that's even easier.

### Provider Support

Using OIDC, this service has been tested with [Auth0](https://auth0.com),
[Okta](https://www.okta.com), and [OneLogin](https://www.onelogin.com).

Using SAML, this service has been tested with [Auth0](https://auth0.com),
[Okta](https://www.okta.com), and [OneLogin](https://www.onelogin.com).

Using LDAP, this service has been tested with OpenLDAP.

## Service Configuration

See the Confluence
[page](https://confluence.perforce.com:8443/display/~nfiedler/Authentication+Integration)
for documentation.

## Certificates

For development we use self-signed certificates, and use the service certificate
to sign the client signing request to produce a client certificate. In practice,
both the service and client would use proper certificates and utilize a trusted
certificate authority.

```shell
$ cd certs
$ openssl req -newkey rsa:4096 -keyout client.key -out client.csr -nodes -days 365 -subj "/CN=LoginExtension"
$ openssl x509 -req -in client.csr -CA sp.crt -CAkey sp.key -out client.crt -set_serial 01 -days 365
```

The auth service reads its certificate and key files using the paths defined in
`SP_CERT_FILE` and `SP_KEY_FILE`, respectively. The path for the certificate
authority certificate is read from the `CA_CERT_FILE` environment variable.
Clients accessing the `requests/status/:id` route will require a valid client
certificate signed by the certificate authority.

### SAML IdP

When the auth service is acting as a SAML identity provider, it uses a public
key pair contained in the files identified by the `IDP_CERT_FILE` and
`IDP_KEY_FILE` environment variables.

## Removing the Extension

Removing the login extension is a two-step process:

1. `p4 extension --delete Auth::loginhook -y`
1. `p4 admin restart`

The `restart` is necessary since `p4d` grooms the authentication mechanims
during startup. Without the restart, it will complain about a missing hook:

```
Command unavailable: external authentication 'auth-check-sso' trigger not found.
```

## Deploying the Service

The service is a Node.js application, and has few requirements, so installation
is relatively easy. With the latest long-term support (LTS) Node, simply get the
service code and run `npm install`. You can then use a process manager, such as
[pm2](http://pm2.keymetrics.io),
[forever](https://github.com/foreverjs/forever), or
[StrongLoop](http://strong-pm.io), to start and manage the service. pm2 is quite
popular and has been used for testing this service. An example configuration
file (typically named `ecosystem.config.js`) is shown below:

```javascript
module.exports = {
  apps: [{
    name: 'auth-svc',
    script: './bin/www',
    env: {
      NODE_ENV: 'development',
      OIDC_CLIENT_ID: 'client_id',
      OIDC_CLIENT_SECRET: 'client_secret',
      OIDC_ISSUER_URI: 'http://localhost:3001/',
      SVC_BASE_URI: 'https://localhost:3000',
      DEFAULT_PROTOCOL: 'oidc',
      CA_CERT_FILE: 'certs/sp.crt',
      IDP_CERT_FILE: 'certs/sp.crt',
      IDP_KEY_FILE: 'certs/sp.key',
      SAML_IDP_SSO_URL: 'http://localhost:7000/saml/sso',
      SAML_IDP_SLO_URL: 'http://localhost:7000/saml/slo',
      SAML_SP_ISSUER: 'urn:example:sp',
      SP_CERT_FILE: 'certs/sp.crt',
      SP_KEY_FILE: 'certs/sp.key'
    }
  }]
}
```

The service does not rely on a database, all data is stored temporarily in
memory. The bulk of the configuration is defined by environment variables. The
service can serve multiple Helix Server installations, as the client initiates
the requests and pulls data as needed.

In terms of availability and load balancing, the service has some state that is
maintained in memory, keyed to an opaque request identifier. The extension
begins the process by asking for a request identifier, and the user logs in
through the service with that request identifier as a parameter. This identifier
is then used to associate the user data with the user logging in via the
extension. As such, it will be necessary to direct all traffic to a single
instance, only switching to a secondary instance when the first has failed.
