# Perforce Authentication Service

This [Node.js](http://nodejs.org) based application implements a simple external
authentication service to be used in concert with the `loginhook` extension. It
supports the OpenID Connect and SAML 2.0 authentication protocols.

## Local Environment

To get the services running on your host, there is some required setup. For a
different approach, you can use Docker as described below, which may be easier
depending on your circumstances.

### Prerequisites

To fetch and build the application dependencies and run tests, you will need
[Node.js](http://nodejs.org) *LTS* installed; the *Current* version may have
compatibility issues with some modules, and in general can be a bit unstable.

### Build and Start

These instructions assume you will be testing with the OpenID provider, as the
SAML test IdP is a little more work to set up, and is easier to run in Docker.

First get the oidc-provider application running:

```shell
$ cd containers/oidc
$ npm install
$ cat << EOF > .env
OIDC_CLIENT_ID=client_id
OIDC_CLIENT_SECRET=client_secret
OIDC_REDIRECT_URI=http://localhost:3000/oidc/callback
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
EOF
$ npm start
```

Lastly, install the authentication integration extension using `node` like so:

```shell
$ P4USER=super P4PORT=localhost:1666 node hook.js
```

## Docker Environment

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

### Testing the p4d connection

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

### Testing the service

```shell
$ curl -D - http://svc.doc:3000

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

### Installing the Extension

To install the authentication integration extension, use `node` like so (the
script assumes the Docker environment by default):

```shell
$ node hook.js
```

For SAML, the extension must be installed slightly differently:

```shell
$ PROTOCOL=saml node hook.js
```

## OpenID Connect Sample Data

The oidc-provider service has a sample user with email `johndoe@example.com`,
and whose account identifier is literally anything. That is, requesting an
account by id `12345` will give you Johnny; requesting another account by id
`67890` will also give you Johnny. The account password is similarly meaningless
as any value is accepted. The only constant is the email address, which is what
the login extension uses to assert a valid user. The docker container for p4d
has a user set up with this email address already.

## SAML Sample Data

The saml-idp test service has exactly one user whose email is
`saml.jackson@example.com` and has no password at all -- just click the **Sign
On** button to log in. The docker container for p4d has a user set up with this
email address already.

## Testing with Okta

Configuring the authentication service with Okta is fairly straightforward.

1. On the Okta admin dashboard, create a new application (helps to use "classic ui").
1. Select *Web* as the **Platform** and *OpenID Connect* as the **Sign on method**.
1. Provide a meaningful name on the next screen.
1. For the **Login redirect URIs** enter the auth service URL; for Docker this would
   be `http://svc.doc:3000/oidc/callback`; we are not using logout redirect URIs yet.
1. On the next screen, copy the **Client ID** and **Client secret** values to the
   `docker-compose.yml` for the `svc.doc` settings under `environment` (namely the
   `OIDC_CLIENT_ID` and `OIDC_CLIENT_SECRET` keys).
1. From the *Sign On* tab, copy the **Issuer** value to `OIDC_ISSUER_URI` in the docker
   environment for `svc.doc`.
1. Use `docker-compose` to rebuild and start the `svc.doc` container with the new
   settings (the `build` and `up -d` subcommands are sufficient to rebuild and restart
   the container).

If you have already logged into Okta, be sure to either a) assign that user to
the application you just created, or b) log out so you can log in again using
the credentials for a user that is assigned to the application. Otherwise you
will immediately go to the "login failed" page, and the only indication of the
cause is in the Okta system logs.

## Why Node and Passport?

### Node.js

Applications running on Node are sufficiently fast, especially compared to
Python or Ruby. There are multiple OIDC and SAML libraries for Node to choose
from. Deploying to a variety of systems is well supported.

### Passport

The [passport](http://www.passportjs.org) library is very popular and easy to
use. There are [SAML](https://github.com/bergie/passport-saml) and
[OIDC](https://github.com/panva/node-openid-client) modules, as well as many
other authentication protocols.

## Coding Conventions

With respect to the JavaScript code, the formatting follows
[StandardJS](https://standardjs.com). The
[linter](https://atom.io/packages/linter-js-standard) available in
[Atom](https://atom.io) is very good, and catches many common coding mistakes.
Likewise with [Visual Studio Code](https://code.visualstudio.com) and the
[StandardJS](https://github.com/standard/vscode-standardjs) extension.
