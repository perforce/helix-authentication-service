# Development

## Setup

### Prerequisites

To fetch and build the application dependencies and run tests, you will need
[Node.js](http://nodejs.org) *12* or higher due to dependencies.

### Build and Start

Configure the authentication service as described in the `Getting_Started.md`
file, then build and start the authentication service application:

```shell
$ npm install
$ npm start
```

### Installing the Extension

To install the authentication integration extension, use `node` like so:

```shell
$ node hook.js
```

## Using SAML

For SAML, the extension must be installed slightly differently:

```shell
$ PROTOCOL=saml node hook.js
```

You will almost certainly have to change the `name-identifier` setting to
`nameID` as well, since typical SAML identity providers do not include an
`email` property. To configure the extension run the command below:

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

## Tips and Tricks

### Controlling URL open

By setting `P4USEBROWSER` to `false` you can prevent the browser from opening
when you invoke `p4 login`. Not all that useful, but good to know.

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
