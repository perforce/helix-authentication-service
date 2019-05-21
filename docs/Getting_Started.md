# Getting Started

## Authentication Service

### Installation Script

A bash script named `install.sh` is provided for setting up a Linux-based system
for running the authentication service. It will install Node, pm2, and build the
service dependencies. After the installation is complete, it will be necessary
to modify the service configuration (by editing the `ecosystem.config.js` file),
install SSL certificates, and then restart the service (using `pm2 startOrReload
ecosystem.config.js`). The rest of this section describes the steps you can use
to install the service manually. Subsequent sections describe the configuration
and installation of SSL certificates.

### Requirements

The latest long-term supported release of [Node](https://nodejs.org/en/).

#### CentOS

CentOS lacks Node.js packages, but there are packages available from
[nodesource.com](https://nodesource.com) that are easy to install.

```shell
$ sudo yum -q -y install git gcc-c++ make
$ curl -sL https://rpm.nodesource.com/setup_10.x | sudo -E bash -
$ sudo yum -q -y install nodejs
```

#### Ubuntu

CentOS lacks up-to-date Node.js packages, but there are packages available from
[nodesource.com](https://nodesource.com) that are easy to install.

```shell
$ sudo apt-get install -q -y build-essential
$ sudo apt-get install -q -y curl
$ curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
$ sudo apt-get install -q -y nodejs
```

### Build

With the authentication service code downloaded, open a terminal window and
change to the directory containing the service code. Then download and build the
dependencies using the `npm` command, like so:

```shell
$ npm install
```

### Configure

The authentication service is configured using environment variables. Since
there are numerous settings, it is easiest to create a file called `.env` that
will contain all of the settings. See the configuration documentation on the
Confluence
[page](https://confluence.perforce.com:8443/display/~nfiedler/Authentication+Integration)
for all of the details. If you change the `.env` file while the service is
running, the service must be restarted for the changes to take effect.

#### Certificates

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

##### SAML IdP

When the auth service is acting as a SAML identity provider, it uses a public
key pair contained in the files identified by the `IDP_CERT_FILE` and
`IDP_KEY_FILE` environment variables.

### Deploy

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

#### npm

By far the simplest way to run the authentication service is using `npm start`
from a terminal window. However, that is not robust, as any crash will bring the
service down until it is started again. Better to use something like
[pm2](http://pm2.keymetrics.io),
[forever](https://github.com/foreverjs/forever), or
[StrongLoop](http://strong-pm.io) to start and manage the service.

#### pm2

The pm2 process manager is quite popular and has been used for testing this
service. An example configuration file (typically named `ecosystem.config.js`)
is shown below:

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

## Loginhook Extension

### Requirements

Before installing the loginhook extension, make sure the Helix Server has been
updated to at least the 2019.1 release. This is the release in which extensions
support was added, and the loginhook depends on this feature.

### Build

If you already have the `loginhook.p4-extension` file, then skip down to the
**Install** section. If you want to build the loginhook extension from the
source code of the authentication server, it is as easy as running `p4
extension` in a terminal window:

```shell
$ p4 extension --package loginhook
```

The result will be a zip file named `loginhook.p4-extension` which can be
installed as described in the next section.

### Install

If this is not the first time you are installing the extension, then it will be
necessary to remove it first. See the section below on removing the extension.

Now you are ready to install the extension.

```shell
$ p4 extension --install loginhook.p4-extension -y
Extension 'Auth::loginhook#1.0' installed successfully.
```

### Configure

For the extension to be fully operational, it is necessary to configure it at
both the "global" and "instance" level. See the extensions documentation for an
explanation of that concept. This document will only cover the extension itself.

#### Global

Start by getting the global configuration of the extension:

```shell
$ p4 extension --configure Auth::loginhook
[snip]

ExtP4USER:     sampleExtensionsUser

ExtConfig:
    Auth-Protocol:
        ... Authentication protocol, such as saml or oidc.
    Service-URL:
        ... The authentication service base URL.
```

The first field to change is `ExtP4USER` which should be the Perforce user that
will own this extension, typically a "super" or administrative user.

You will need to change both fields, `Auth-Protocol` and `Service-URL`, as there
are no defaults for either of them. The `Auth-Protocol` can be any value
supported by the authentication service, which at this time is `ldap`, `oidc`,
and `saml`. This determines the authentication protocol that SSO users will be
using to authenticate. The configuration of the identity provider is in the
authentication service itself.

The `Service-URL` field should be changed to the address of the authentication
service. Note that this should match the value of `SVC_BASE_URI` in the service
configuration. This address must be resolvable and reachable from both the Helix
Server and the desktop clients.

#### Instance

To configure a single "instance" of the extension, include the `--name` option
along with the `--configure` option. The name can be anything; here we used
`loginhook-all` just to be descriptive.

```shell
p4 extension --configure Auth::loginhook --name loginhook-all -o
[snip]

ExtConfig:
    enable-logging:
        ... Extension will write debug messages to a log if 'true'.
    name-identifier:
        ... Field within IdP response containing unique user identifer.
    non-sso-groups:
        ... Those groups whose members will not be using SSO.
    non-sso-users:
        ... Those users who will not be using SSO.
    user-identifier:
        ... Trigger variable used as unique user identifier.
```

All of these settings have sensible defaults. However, for the extension to be
enabled we must at least go through the motions of configuring it. In practice,
it is very likely that an administrator will want to change either the
`non-sso-groups` or `non-sso-users` fields to a list of Perforce groups and
users that are not participating in the SSO authentication integration.

See the Confluence
[page](https://confluence.perforce.com:8443/display/~nfiedler/Authentication+Integration)
for additional details.

## Helix Server

As mentioned earlier, the loginhook extension requires Helix Server 2019.1 or
later. Additionally, there are likely other configuration changes that you will
want to make, such as allowing password fallback for non-SSO users, and changing
SSO user password to long random values (thus forcing the use of SSO).

### Password Fallback

To allow for non-SSO passwords, and to allow for the super user to set the
passwords of SSO users, configure the server using the `p4 configure` command
like so:

```shell
$ p4 configure set auth.sso.allow.passwd=1
``` 

When the server is running at security level 3, all users must have a valid
password in the database, regardless of the method of authentication. That is,
even SSO users will need a password in the database. That password can be
anything, since the SSO user will never use it, and is best set to something
random. A handy way to set passwords for users (on Linux) would look like this:

```shell
$ yes $(uuidgen) | p4 -u super passwd username
```

## Removing the Extension

Removing the login extension involves a few commands. Start by finding the
installed extension using the `--list` option.

```shell
$ p4 extension --list --type=extensions
... extension Auth::loginhook
... rev 1
... developer Perforce
... description-snippet SSO auth integration
... UUID 117E9283-732B-45A6-9993-AE64C354F1C5
... version 1.0
... enabled true
... arch-dir server.extensions.dir/117E9283-732B-45A6-9993-AE64C354F1C5/1-arch
... data-dir server.extensions.dir/117E9283-732B-45A6-9993-AE64C354F1C5/1-data
```

To remove that extension, use the `--delete` option as an administrative user.

```shell
$ p4 extension --delete --yes Auth::loginhook
Extension 'Auth::loginhook and its configurations' successfully deleted.
$ p4 admin restart
```

The `restart` is necessary since `p4d` grooms the authentication mechanims
during startup. Without the restart, the server will report an error about a
missing hook:

```
Command unavailable: external authentication 'auth-check-sso' trigger not found.
```

## SELinux

Both the Helix Server extensions and the Node.js authentication service run on
Linux systems with SELinux enabled and in **enforcing** mode, without any
necessary changes.
