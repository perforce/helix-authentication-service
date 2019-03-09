# Perforce Authentication Service

This [Node.js](http://nodejs.org) based application implements a simple external
authentication service to be used in concert with the `loginhook` extension. It
supports the OpenID Connect and SAML 2.0 authentication protocols.

## Overview

### Architecture

The service itself is a simple Node.js web application that leverages several
open source libraries to interact with standards-based authentication providers.
This can be installed and run anywhere on the network, as long as it is
reachable from the Helix Server. The other half of the system, albeit a very
small half, is the Perforce extension installed on the Helix Server, which acts
as a mediator between the service and the server. When a Perforce user attempts
to log in to the server, the extension will cause their web browser to open to
the authenication provider, and meanwhile ping the service to get the
authentication success status. Once the user has successfully authenticated with
the provider, the extension will get the results and signal the server to issue
a ticket (or not, and fail the login).

This design lends itself well to integrating other authentication protocols,
including custom schemes developed by authentication providers such as
[Auth0](http://auth0.com/) -- just add `passport-auth0` as a Node dependecy, add
a new route to the service, and configure the extension to use the new protocol.
Of course, if they support OIDC or SAML, that's even easier.

### Provider Support

Using OIDC, this service has been tested with [Auth0](https://auth0.com),
[Okta](https://www.okta.com), and [OneLogin](https://www.onelogin.com).

Using SAML, this service has been tested with [Auth0](https://auth0.com),
[Okta](https://www.okta.com), and [OneLogin](https://www.onelogin.com).

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
SVC_BASE_URI=http://localhost:3000
SAML_IDP_SSO_URL=http://localhost:7000/saml/sso
SAML_IDP_SLO_URL=http://localhost:7000/saml/slo
EOF
$ npm start
```

Lastly, install the authentication integration extension using `node` like so:

```shell
$ P4USER=super P4PORT=localhost:1666 AUTH_URL=http://localhost:3000 node hook.js
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
in** button to log in. The docker container for p4d has a user set up with this
email address already.

## Running Service as HTTP

Assuming you are using the Docker containers:

1. Change `SVC_SCHEME`, `USE_HTTP`, and the service URLs in `docker-compose.yml`
1. (Re)Build the containers and start them (again)
1. Deploy the extension with the appropriate `AUTH_URL` (e.g. using `AUTH_URL=... node hook.js`)

## Service Configuration

The authentication service configuration is based on environment variables. The
application uses [dotenv](https://github.com/motdotla/dotenv) to read a file
named `.env` in the working directory, which provides values for the various
settings, described below. You can also simply define the values in the
environment, which is how it is done with Docker (using the `docker-compose.yml`
file).

### OIDC settings

| Name                | Description                      |
| ------------------- | -------------------------------- |
| `OIDC_CLIENT_ID`    | client identifier                |
| `OIDC_CLIENT_SECRET`| client secret                    |
| `OIDC_ISSUER_URI`   | the OIDC provider issuer URL     |
| `OIDC_REDIRECT_URI` | the redirect uri for the OIDC RP |

OpenID Connect also has a discovery feature in which the identity provider
advertises various properties. The URI path is
`/.well-known/openid-configuration`, which is described in the
[specification](https://openid.net/specs/openid-connect-discovery-1_0.html).

### SAML settings

| Name               | Description                                                          |
| ------------------ | -------------------------------------------------------------------- |
| `SVC_BASE_URL`     | service provider base URL                                            |
| `SAML_IDP_SSO_URL` | URL of IdP Single Sign-On service                                    |
| `SAML_IDP_SLO_URL` | URL of IdP Single Log-Out service                                    |
| `SAML_SP_ISSUER`   | service provider issuer identifier                                   |
| `SAML_SP_AUDIENCE` | service provider audience value for `AudienceRestriction` assertions |

### Other settings

| Name          | Description                         |
| ------------- | ----------------------------------- |
| `SP_KEY_FILE` | service provider private key file   |
| `SP_KEY_ALGO` | algorithm used to sign the requests |

## Testing with Auth0

### OpenID Connect

By default the "regular web application" configured in Auth0 will have OpenID
Connect support, so all that is needed is to copy the settings to the service
configuration.

From the Auth0 management screen, select *Applications* from the left sidebar,
click on your application, and on the *Settings* tab, scroll to the bottom and
click the **Advanced Settings** link. Find the *Endpoints* tab and select it to
reveal the various endpoints. Open the **OpenID Configuration** value in a new
browser tab to get the raw configuration values. Find `issuer` and copy the
value to `OIDC_ISSUER_URI` in the service config. You can now close the
configuration tab.

On the application screen, scroll up to the top of *Settings* and copy the
**Client ID** value to the `OIDC_CLIENT_ID` setting in the service config.
Likewise for the **Client Secret** value.

The one other change to make in the Auth0 application configuration is the
addition of the **Allowed Callback URLs** under *Settings*. As with the other
providers, put the service callback URL, either
`https://svc.doc:3000/oidc/callback` or `https://svc.doc:3000/saml/sso` as
appropriate for the protocol

### SAML 2.0

To enable SAML 2.0 in Auth0, you must enable the **SAML 2.0** "addon" from the
application settings. Put the `https://svc.doc:3000/saml/sso` URL for the
**Application Callback URL**, and ensure the **Settings** block looks something
like the following:

```javascript
{
  "signatureAlgorithm": "rsa-sha256",
  "digestAlgorithm": "sha256",
  "nameIdentifierProbes": [
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
  ],
  "logout": {
    "callback": "https://svc.doc:3000/saml/slo"
  }
}
```

The important part of that configuration is to set the `nameIdentifierProbes`,
otherwise the NameID returned in the SAML response is the default generated
value, which is difficult to tie back to the Perforce user account.

On the *Usage* tab of the addon screen, copy the **Identity Provider Login URL**
to the `SAML_IDP_SSO_URL` setting in the service configuration. To get the SLO
URL you will need to download the metadata and look for the
`SingleLogoutService` element, copying the `Location` attribute value to
`SAML_IDP_SLO_URL` in the config.

## Testing with Okta

Configuring the authentication service with Okta is fairly straightforward.

### OpenID Connect

1. On the Okta admin dashboard, create a new application (helps to use "classic ui").
1. Select *Web* as the **Platform** and *OpenID Connect* as the **Sign on method**.
1. Provide a meaningful name on the next screen.
1. For the **Login redirect URIs** enter the auth service URL; for Docker this
   would be `https://svc.doc:3000/oidc/callback`; we are not using logout
   redirect URIs yet.
1. On the next screen, copy the **Client ID** and **Client secret** values to
   the `docker-compose.yml` for the `svc.doc` settings under `environment`
   (namely the `OIDC_CLIENT_ID` and `OIDC_CLIENT_SECRET` keys).
1. From the *Sign On* tab, copy the **Issuer** value to `OIDC_ISSUER_URI` in the
   docker environment for `svc.doc`.
1. Use `docker-compose` to rebuild and start the `svc.doc` container with the
   new settings (the `build` and `up -d` subcommands are sufficient to rebuild
   and restart the container).

If you have already logged into Okta, be sure to either a) assign that user to
the application you just created, or b) log out so you can log in again using
the credentials for a user that is assigned to the application. Otherwise you
will immediately go to the "login failed" page, and the only indication of the
cause is in the Okta system logs.

Visit the auth service OIDC [login page](https://svc.doc:3000/oidc/login) to
test. Note that this URL will be configured into the auth extension, the user
will never have to enter the value directly.

### SAML 2.0

1. On the Okta admin dashboard, create a new application (helps to use "classic ui").
1. Select *Web* as the **Platform** and *SAML 2.0* as the **Sign on method**.
1. For the **Single sign on URL** enter the auth service URL; for Docker this
   would be `https://svc.doc:3000/saml/sso`
1. For the **Audience URI** enter `urn:example:sp`, assuming you are using Docker.
1. For the **Name ID format** the auth extensions expect *EmailAddress*,
   otherwise it cannot verify the expected user has authenticated.
1. From the *Sign On* tab, click the **View Setup Instructions** button and copy
   the values for IdP SSO and SLO URLs to the `SAML_IDP_*` settings in the
   docker environment for `svc.doc`.
1. Use `docker-compose` to rebuild and start the `svc.doc` container with the
   new settings (the `build` and `up -d` subcommands are sufficient to rebuild
   and restart the container).

If you have already logged into Okta, be sure to either a) assign that user to
the application you just created, or b) log out so you can log in again using
the credentials for a user that is assigned to the application. Otherwise you
will immediately go to the "login failed" page, and the only indication of the
cause is in the Okta system logs.

Visit the auth service SAML [login page](https://svc.doc:3000/saml/login) to
test. Note that this URL will be configured into the auth extension, the user
will never have to enter the value directly.

## Testing with OneLogin

### OpenID Connect

1. From the admin dashboard, create a new app: search for `OIDC` and select
   **OpenId Connect (OIDC)** from the list.
1. On the *Configuration* screen, enter `https://svc.doc:3000/oidc/login` for **Login Url**
1. On the same screen, enter `https://svc.doc:3000/oidc/callback` for **Redirect URI's**
1. Find the **Save** button and click it.
1. From the *SSO* tab, copy the **Client ID** value to the `OIDC_CLIENT_ID`
   setting in the docker environment for `svc.doc`.
1. From the *SSO* tab, copy the **Client Secret** value to the
   `OIDC_CLIENT_SECRET` setting in the docker environment for `svc.doc` (n.b.
   you may need to "show" the secret first before the copy button will work).
1. Use `docker-compose` to rebuild and start the `svc.doc` container with the
   new settings (the `build` and `up -d` subcommands are sufficient to rebuild
   and restart the container).

Visit the auth service OIDC [login page](https://svc.doc:3000/oidc/login) to
test. Note that this URL will be configured into the auth extension, the user
will never have to enter the value directly.

### SAML 2.0

1. From the admin dashboard, create a new app: search for `SAML` and select
   **SAML Test Connector (IdP w/ NameID Persistent)** from the list.
1. On the *Configuration* screen, enter `urn:example:sp` for **Audience**
1. On the same screen, enter `https://svc.doc:3000/saml/sso` for **Recipient**
1. And for *ACS (Consumer) URL Validator*, enter `.*` to match any value
1. For *ACS (Consumer) URL*, enter `https://svc.doc:3000/saml/sso`
1. For *Single Logout URL*, enter `https://svc.doc:3000/saml/slo`
1. Find the **Save** button and click it.
1. From the *SSO* tab, copy the **SAML 2.0 Endpoint** value to the
   `SAML_IDP_SSO_URL` setting in the docker environment for `svc.doc`.
1. From the *SSO* tab, copy the **SLO Endpoint** value to the `SAML_IDP_SLO_URL`
   setting in the docker environment for `svc.doc`.
1. Use `docker-compose` to rebuild and start the `svc.doc` container with the
   new settings (the `build` and `up -d` subcommands are sufficient to rebuild
   and restart the container).

Visit the auth service SAML [login page](https://svc.doc:3000/saml/login) to
test. Note that this URL will be configured into the auth extension, the user
will never have to enter the value directly.

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
