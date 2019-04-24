# Perforce Authentication Service

This [Node.js](http://nodejs.org) based application implements a simple external
authentication service to be used in concert with the `loginhook` extension. It
supports the OpenID Connect and SAML 2.0 authentication protocols, as well as
BIND authentication with an LDAP server.

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

## Development Environments

### Local Environment

To get the services running on your host, there is some required setup. For a
different approach, you can use Docker as described below, which may be easier
depending on your circumstances.

#### Prerequisites

To fetch and build the application dependencies and run tests, you will need
[Node.js](http://nodejs.org) *LTS* installed; the *Current* version may have
compatibility issues with some modules, and in general can be a bit unstable.

#### Build and Start

These instructions assume you will be testing with the OpenID provider, as the
SAML test IdP is a little more work to set up, and is easier to run in Docker.

First get the oidc-provider application running:

```shell
$ cd containers/oidc
$ npm install
$ cat << EOF > .env
OIDC_CLIENT_ID=client_id
OIDC_CLIENT_SECRET=client_secret
OIDC_REDIRECT_URI=https://localhost:3000/oidc/callback
OIDC_LOGOUT_REDIRECT_URI=https://svc.doc:3000
EOF
$ PORT=3001 npm start
```

Then start the authentication service application:

```shell
$ npm install
$ cat << EOF > .env
OIDC_CLIENT_ID=client_id
OIDC_CLIENT_SECRET=client_secret
OIDC_ISSUER_URI=http://localhost:3001/
SVC_BASE_URI=https://localhost:3000
DEFAULT_PROTOCOL=oidc
CA_CERT_FILE=certs/sp.crt
IDP_CERT_FILE=certs/sp.crt
IDP_KEY_FILE=certs/sp.key
SAML_IDP_SSO_URL=http://idp.doc:7000/saml/sso
SAML_IDP_SLO_URL=http://idp.doc:7000/saml/slo
SAML_SP_ISSUER=urn:example:sp
SP_CERT_FILE=certs/sp.crt
SP_KEY_FILE=certs/sp.key
EOF
$ npm start
```

Lastly, install the authentication integration extension using `node` like so:

```shell
$ P4PORT=localhost:1666 AUTH_URL=https://localhost:3000 node hook.js
```

### Docker Environment

In this code base are configuration files for [Docker](http://docker.com), which
is used to start the various services needed for testing. To get everything set
up, install `docker`, `docker-compose`, and possibly `docker-machine` (if you
are running on macOS, [Homebrew](http://brew.sh) makes this easy).

```shell
$ docker-compose build
$ docker-compose up -d
```

The p4d server is reachable by the port identified in the `docker-compose.yml` file
(i.e. `1666`). If using `docker-machine`, the services are bound to the IP
address of the virtual machine, so `p4 -p $(docker-machine ip):1666 info` would
request the server information.

For the host to be able to resolve the container names, it may be necessary to
install [dnsmasq](http://www.thekelleys.org.uk/dnsmasq/doc.html) to resolve the
`.doc` domain to the docker machine. This complication comes about because the
containers need to see each other, which they do using their container names,
and the host needs to be able to reach the containers using those same names.
See https://passingcuriosity.com/2013/dnsmasq-dev-osx/ for a helpful guide.

#### Testing the p4d connection

```shell
$ p4 -p p4d.doc:1666 info
User name: joe
Client name: joe-auth
Client host: kuro.local
Client unknown.
Current directory: /Users/joe/auth
Peer address: 192.168.99.1:50957
Client address: 192.168.99.1
Server address: 3f09d3d78fbd:1666
Server root: /opt/perforce/servers/despot/root
Server date: 2019/02/06 19:56:13 +0000 UTC
Server uptime: 00:00:08
Server version: P4D/LINUX26X86_64/2019.1.MAIN-TEST_ONLY/1755790 (2019/02/06)
ServerID: despot
Server services: commit-server
Server license: none
Case Handling: sensitive

$ p4 -u super -p p4d.doc:1666 login
[enter password from Dockerfile]

$ p4 -u super -p p4d.doc:1666 users -a
jackson <saml.jackson@example.com> (Sam L. Jackson) accessed 2019/02/06
johndoe <johndoe@example.com> (John Doe) accessed 2019/02/06
super <super@fcafbbe2216b> (super) accessed 2019/02/06
```

#### Testing the service

```shell
$ curl -D - https://svc.doc:3000

HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: text/html; charset=utf-8
Content-Length: 207
ETag: W/"cf-sMq3uu/Hzh7Qc54TveG8DxiBA2U"
Date: Thu, 07 Feb 2019 22:31:04 GMT
Connection: keep-alive

<!DOCTYPE html>
<html>
  <head>
    <title>Express</title>
    <link rel='stylesheet' href='/stylesheets/style.css' />
  </head>
  <body>
    <h1>Express</h1>
    <p>Welcome to Express</p>
  </body>
</html>
```

#### Installing the Extension

To install the authentication integration extension, use `node` like so (the
script assumes the Docker environment by default):

```shell
$ node hook.js
```

For SAML, the extension must be installed slightly differently:

```shell
$ PROTOCOL=saml node hook.js
```

You will almost certainly have to change the `name-identifier` setting to
`nameID` as well, since typical SAML identity providers do not include an
`email` property, including the test SAML IdP. Invoke the extension configure
command to bring up the form:

```shell
$ p4 extension --configure Auth::loginhook --name loginhook-all
```

## Sample Data

### LDAP Sample Data

The OpenLDAP server running in Docker has a group named `users` and a single
user named `george` whose password is `Passw0rd!`.

### OpenID Connect Sample Data

The oidc-provider service has a sample user with email `johndoe@example.com`,
and whose account identifier is literally anything. That is, requesting an
account by id `12345` will give you Johnny; requesting another account by id
`67890` will also give you Johnny. The account password is similarly meaningless
as any value is accepted. The only constant is the email address, which is what
the login extension uses to assert a valid user. The docker container for p4d
has a user set up with this email address already.

### SAML Sample Data

The saml-idp test service has exactly one user whose email is
`saml.jackson@example.com` and has no password at all -- just click the **Sign
in** button to log in. The docker container for p4d has a user set up with this
email address already.

## Service Configuration

See the Confluence
[page](https://confluence.perforce.com:8443/display/~nfiedler/Authentication+Integration)
for documentation.

## Running the Service on HTTP

If for some reason you do not want the auth service to be using HTTPS and its
self-signed certificate, you can use HTTP instead. This is particularly relevant
when testing with a browser that refuses to open insecure web sites, such as the
SAML Desktop Agent with its embedded Chromium browser.

Assuming you are using the Docker containers:

1. Change `SVC_PROTOCOL`, `PROTOCOL`, and the service URLs in `docker-compose.yml`
1. (Re)Build the containers and start them (again)
1. Deploy the extension with the appropriate `AUTH_URL` (e.g. using `AUTH_URL=... node hook.js`)

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

## Coding Conventions

With respect to the JavaScript code, the formatting follows
[StandardJS](https://standardjs.com). The
[linter](https://atom.io/packages/linter-js-standard) available in
[Atom](https://atom.io) is very good, and catches many common coding mistakes.
Likewise with [Visual Studio Code](https://code.visualstudio.com) and the
[StandardJS](https://github.com/standard/vscode-standardjs) extension.
