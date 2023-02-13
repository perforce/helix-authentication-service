# Development

This document is intended for developers who are interested in learning how
to modify and test the Helix Authentication Service.

## Setup

### Prerequisites

To fetch and build the application dependencies and run tests, you will need
[Node.js](http://nodejs.org) *LTS* or higher.

### Build and Start

Configure the authentication service as described in the documentation, then
build and start the authentication service:

```shell
$ npm install
$ npm start
```

## Docker

Refer to the `README.md` file in the `containers` directory for instructions.

### Authentication Extension

The containers for the extension for integrating the authentication service with
Helix Core are in a separate
[repository](https://github.com/perforce/helix-authentication-extension) and can
be installed using `docker compose` as described in the documentation for that
project.

## Automated Testing

Some automated tests are provided for ensuring basic operational soundness (e.g.
user can authenticate via IdP, application can retrieve user profile data). The
login tests utilize the [Selenium](https://www.selenium.dev) webdriver to start
Firefox in headless mode. As such, a recent release of
[Firefox](https://www.mozilla.org/en-US/firefox/) must be installed on the test
system. Additionally, the [Docker](#docker) containers defined in
`docker-compose.yml` must be built and running.

```shell
$ docker compose build auth-svc1.doc
$ docker compose up --build -d
$ npm test
```

## Running the Service on HTTP

If for some reason you do not want the auth service to be using HTTPS and its
default self-signed certificate, you can use HTTP instead. This is particularly
relevant when developing with a browser that refuses to open insecure web sites,
such as the SAML Desktop Agent with its embedded Chromium browser.

To switch from `http:` to `https:` you will need to change at least three settings:

1. Set `SVC_BASE_URI` appropriately in the auth service configuration.
1. Set service URL in the client system (e.g. Perforce server).
1. Set the callback URL in the identity provider.

## Configure Script on macOS

The configuration script (`bin/configure-auth-service.sh`) uses the GNU getopt
utility to read the command line arguments. However, macOS does not ship with
GNU getopt installed. To run the script on macOS, first install GNU getopt via
[Homebrew](https://brew.sh) `gnu-getopt` package, and then run the script with
the path to the GNU getopt directory:

```shell
$ PATH="/usr/local/opt/gnu-getopt/bin:$PATH" ./bin/configure-auth-service.sh
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
$ npm install -g mermaid.cli
$ mmdc -i docs/sequence_diagram.mmd -t neutral -o flow.png
```
