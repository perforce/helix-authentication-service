# Development

## Environments

### Local Environment

To get the services running on your host, there is some required setup. For a
different approach, you can use Docker as described below, which may be easier
depending on your circumstances.

#### Prerequisites

To fetch and build the application dependencies and run tests, you will need
[Node.js](http://nodejs.org) *12* or higher due to dependencies.

#### Build and Start

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

#### Installing the Extension

To install the authentication integration extension, use `node` like so:

```shell
$ P4PORT=localhost:1666 AUTH_URL=https://localhost:3000 node hook.js
```

### Docker Environment

In this code base are configuration files for [Docker](http://docker.com), which
is used to start the various services needed for developing. To get everything
set up, install `docker`, `docker-compose`, and possibly `docker-machine` (if
you are running on macOS, [Homebrew](http://brew.sh) makes this easy).

```shell
$ docker-compose build
$ docker-compose up -d
```

The p4d server is reachable by the port identified in the `docker-compose.yml`
file (i.e. `1666`). If using `docker-machine`, the services are bound to the IP
address of the virtual machine, so `p4 -p $(docker-machine ip):1666 info` would
request the server information. The `super` user password is defined in the
docker files for the p4d container (tl;dr it's `Rebar123`).

For the host to be able to resolve the container names, it may be necessary to
install [dnsmasq](http://www.thekelleys.org.uk/dnsmasq/doc.html) to resolve the
`.doc` domain to the docker machine. This complication comes about because the
containers need to see each other, which they do using their container names,
and the host needs to be able to reach the containers using those same names.
See https://passingcuriosity.com/2013/dnsmasq-dev-osx/ for a helpful guide.

#### Installing the Extension

To install the authentication integration extension, use `node` like so (the
script assumes the Docker environment by default):

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
`email` property, including the containerized SAML IdP. To configure the
extension run the command below:

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

## Running the Service on HTTP

If for some reason you do not want the auth service to be using HTTPS and its
self-signed certificate, you can use HTTP instead. This is particularly relevant
when developing with a browser that refuses to open insecure web sites, such as
the SAML Desktop Agent with its embedded Chromium browser.

Assuming you are using the Docker containers:

1. Change following in the `docker-compose.yml` file:
    * `SVC_PROTOCOL` to `http`
    * `PROTOCOL` to `http`
    * Service URLs to start with `http://`
1. (Re)Build the containers and start them (again)
1. Configure the login hook extension:
    * `Service-URL` should start with `http://`
    * `Auth-Protocol` should be `saml`

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
