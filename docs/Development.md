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

Several containers are defined for use with [Docker](https://www.docker.com) and
[Docker Compose](https://docs.docker.com/compose/), including an LDAP server,
Shibboleth Identity Provider, and the authentication service. To build and start
the containers, use `docker-compose` like so:

```shell
$ docker-compose build
$ docker-compose up -d
```

### Container Name Resolution

The docker containers have names that are used internally to find each other. In
order for the container host to resolve these names, it may be helpful to
install [dnsmasq](http://www.thekelleys.org.uk/dnsmasq/doc.html). The easiest
way to run dnsmasq is via Docker. If using a macOS system, the commands below
will get dnsmasq and the host configured appropriately:

```shell
$ echo "address=/.doc/127.0.0.1" | sudo tee - /etc/dnsmasq.conf
$ sudo mkdir /etc/resolver
$ echo 'nameserver 127.0.0.1' | sudo tee /etc/resolver/doc
$ docker run --name dnsmasq -d -p 53:53/udp -p 5380:8080 \
    -v /etc/dnsmasq.conf:/etc/dnsmasq.conf \
    --log-opt 'max-size=1m'  -e 'HTTP_USER=admin' -e 'HTTP_PASS=admin' \
    --restart always jpillora/dnsmasq
```

### Authentication Extension

The containers for the extension for integrating the authentication service with
Helix Core are in a separate
[repository](https://github.com/perforce/helix-authentication-extension) and can
be installed using `docker-compose` as described in the documentation for that
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
$ docker-compose build
$ docker-compose up -d
$ npm test
```

## Running the Service on HTTP

If for some reason you do not want the auth service to be using HTTPS and its
self-signed certificate, you can use HTTP instead. This is particularly relevant
when developing with a browser that refuses to open insecure web sites, such as
the SAML Desktop Agent with its embedded Chromium browser.

To switch from `http:` to `https:` you will need to change at least three settings:

1. Set `SVC_BASE_URI` appropriately in the auth service configuration.
1. Set service URL in the client system (e.g. Perforce server).
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
$ openssl req -x509 -nodes -days 3650 -newkey rsa:4096 -keyout ca.key -out ca.crt -subj "/CN=FakeAuthority"
$ openssl req -nodes -days 3650 -newkey rsa:4096 -keyout client.key -out client.csr -subj "/CN=LoginExtension"
$ openssl x509 -req -in client.csr -CA ca.crt -CAkey ca.key -out client.crt -set_serial 01 -days 3650
# remove the client.csr
# move the client.crt and client.key to the login extension
$ openssl req -x509 -nodes -days 3650 -newkey rsa:4096 -keyout server.key -out server.crt -subj "/CN=AuthService"
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
