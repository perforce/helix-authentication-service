# Development

## Setup

### Prerequisites

To fetch and build the application dependencies and run tests, you will need
[Node.js](http://nodejs.org) *12* or higher due to dependencies.

### Build and Start

These instructions assume you will be developing with the included OpenID
provider, as the SAML IdP is a little more work to set up.

First get the oidc-provider application running:

```shell
$ cd containers/oidc
$ npm install
$ cat << EOF > .env
OIDC_CLIENT_ID=client_id
OIDC_CLIENT_SECRET=client_secret
OIDC_REDIRECT_URI=https://localhost:3000/oidc/callback
OIDC_LOGOUT_REDIRECT_URI=https://localhost:3000
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
PROTOCOL=https
DEFAULT_PROTOCOL=oidc
CA_CERT_FILE=certs/ca.crt
IDP_CERT_FILE=certs/server.crt
IDP_KEY_FILE=certs/server.key
SAML_IDP_SSO_URL=http://localhost:7000/saml/sso
SAML_IDP_SLO_URL=http://localhost:7000/saml/slo
SAML_SP_ISSUER=urn:example:sp
SP_CERT_FILE=certs/server.crt
SP_KEY_FILE=certs/server.key
EOF
$ npm start
```

### Installing the Extension

To install the authentication integration extension, use `node` like so:

```shell
$ P4PORT=localhost:1666 AUTH_URL=https://localhost:3000 node hook.js
```

## Using SAML

For SAML, the extension must be installed slightly differently:

```shell
$ PROTOCOL=saml node hook.js
```

You will almost certainly have to change the `name-identifier` setting to
`nameID` as well, since typical SAML identity providers do not include an
`email` property, including the containerized SAML IdP. To configure the
extension run the command below:

```shell
$ p4 extension --configure Auth::loginhook --name loginhook-all
```

## Running the Service on HTTP

If for some reason you do not want the auth service to be using HTTPS and its
self-signed certificate, you can use HTTP instead. This is particularly relevant
when developing with a browser that refuses to open insecure web sites, such as
the SAML Desktop Agent with its embedded Chromium browser.

To switch from `http:` to `https:` you will need to change at least three settings:

1. Set `SVC_BASE_URI` appropriately in the auth service configuration.
1. Set `Service-URL` in the Helix server extension.
1. Set the callback URL in the identity provider.

## Generating the Certificates

For development we create a self-signed certificate for the authentication
service and use that to sign the client signing request for the server
extension, thus creating the client certificate for the extension. This works
fine for the client since our service will accept its own certificate as a
certificate authority. However, we cannot use this same trick with the service
since the browsers will not accept our fake certificate authority. For now, we
only sign the client certificate and leave the service certificate as
self-signed, since most browsers will tolerate that.

```shell
$ cd certs
$ openssl req -newkey rsa:4096 -keyout client.key -out client.csr -nodes -days 365 -subj "/CN=LoginExtension"
$ openssl x509 -req -in client.csr -CA ca.crt -CAkey ca.key -out client.crt -set_serial 01 -days 365
$ rm client.csr ; mv client.crt client.key ../loginhook
$ openssl req -newkey rsa:4096 -keyout server.key -out server.crt -nodes -days 365 -x509 -subj "/CN=AuthService"
```

## Coding Conventions

With respect to the JavaScript code, the formatting follows
[StandardJS](https://standardjs.com). The
[linter](https://atom.io/packages/linter-js-standard) available in
[Atom](https://atom.io) is very good, and catches many common coding mistakes.
Likewise with [Visual Studio Code](https://code.visualstudio.com) and the
[StandardJS](https://github.com/standard/vscode-standardjs) extension.

## Design: Sequence Diagram

The `sequence_diagram.mmd` uses [mermaid](https://mermaidjs.github.io) syntax,
which the [mermaid.cli](https://github.com/mermaidjs/mermaid.cli) tool reads to
produce the diagram of the authentication workflow.

To generate the diagram, invoke `mmdc` like so:

```shell
$ mmdc -i docs/sequence_diagram.mmd -t neutral -o flow.png
```
