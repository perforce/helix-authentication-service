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

In general, configuration will consist of defining the identity provider (IdP)
details for either OIDC or SAML, and setting the `SVC_BASE_URI` of the
authentication service. For better security, the self-signed certificates will
need to be replaced with ones signed by a trusted certificate authority.

### Requirements

The service requires version 12 or higher of [Node](https://nodejs.org/en/).

#### CentOS

CentOS lacks Node.js packages, but there are packages available from
[nodesource.com](https://nodesource.com) that are easy to install.

```shell
$ sudo yum -q -y install git gcc-c++ make
$ curl -sL https://rpm.nodesource.com/setup_12.x | sudo -E bash -
$ sudo yum -q -y install nodejs
```

#### Ubuntu

CentOS lacks up-to-date Node.js packages, but there are packages available from
[nodesource.com](https://nodesource.com) that are easy to install.

```shell
$ sudo apt-get install -q -y build-essential
$ sudo apt-get install -q -y curl
$ curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash -
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
will contain all of the settings. If you change the `.env` file while the
service is running, the service must be restarted for the changes to take
effect. See the **Deploy** section below as the choice of process manager will
effect how environment variables are defined.

#### OpenID Connect settings

| Name                 | Description                                                      |
| -------------------- | ---------------------------------------------------------------- |
| `OIDC_CLIENT_ID`     | The client identifier as provided by the OIDC identity provider. |
| `OIDC_CLIENT_SECRET` | The client secret as provided by the OIDC identity provider.     |
| `OIDC_ISSUER_URI`    | The OIDC provider issuer URL.                                    |

OpenID Connect also has a discovery feature in which the identity provider
advertises various properties. The URI path is
`/.well-known/openid-configuration`, which is described in the OIDC
[specification](https://openid.net/specs/openid-connect-discovery-1_0.html). See
the `Identity_Providers.md` file in the `docs` directory for guidance with
several popular identity providers.

#### SAML settings

| Name                 | Description                        | Default |
| -------------------- | ---------------------------------- | ------- |
| `SAML_IDP_SSO_URL`   | URL of IdP Single Sign-On service. | _none_  |
| `SAML_IDP_SLO_URL`   | URL of IdP Single Log-Out service. | _none_  |
| `SAML_SP_ISSUER`     | The service provider identity provider that will be using the auth service as a SAML IdP. | `urn:example:sp` |
| `IDP_CONFIG_FILE`    | Path of the configuration file that defines SAML service providers that will be connecting to the authentication service. | _See note below_ |
| `SAML_SP_AUDIENCE`   | Service provider audience value for `AudienceRestriction` assertions. | _none_ |
| `SAML_NAMEID_FIELD`  | Name of the property in the user profile to be used if nameID is missing, as is likely the case when using another authentication protocol (e.g. OIDC) with the real identity provider (e.g. Okta). | _See note below_ |
| `SAML_NAMEID_FORMAT` | The desired NameID format expected from the SAML identity provider. Defaults to `urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified`, and can be set to any of the formats defined in the SAML specifications. | _See description_ |

SAML identity providers will advertise some of this information via their
metadata URL. The URL is different for each provider, unlike OIDC. See the
`Identity_Providers.md` file in the `docs` directory for guidance with several
popular identity providers.

Note on `IDP_CONFIG_FILE`: When the authentication service is acting as a SAML
identity provider, it reads some of its settings from a configuration file,
identified by the `IDP_CONFIG_FILE` environment variable. By default this file
is named `saml_idp.conf.js` and is located in the `routes` directory. It is
evaluated using the Node.js `require()` function, so it can be any valid
JavaScript or JSON. See the default configuration file for comments and
explanations of the available settings. _N.B. Changing the configuration file
requires restarting the service, since Node will cache it in memory._

Note on `SAML_NAMEID_FIELD`: If not specified, the service will try `email` and
`sub`, and if all else fails, generate a unique identifier (the value is used as
a unique key for the user data, so we cannot use a hard-coded value). To see the
raw user profile returned by the identity provider, enable the debug logging
(see the `DEBUG` entry below) and watch for **"legacy setting nameID"** in the
log output.

#### Other Settings

| Name               | Description | Default |
| ------------------ | ----------- | ------- |
| `DEBUG`            | Set to `auth:*` to enable debug logging in the service (writes to standard error). | _none_ |
| `FORCE_AUTHN`      | If set to any non-empty value, will cause the service to require the user to authenticate, even if they already authenticated. For SAML this means setting the `forceAuthn` field set to true, while for OIDC it will set the `max_age` parameter to `0`. This is not supported by all identity providers, especially for OIDC. | _none_ |
| `SESSION_SECRET`   | Password used for encrypting the in-memory session data. | `keyboard cat` |
| `SVC_BASE_URI`     | The authentication service base URL visible to end users. Needs to match the application settings defined in IdP configuration. | _none_ |
| `SP_CERT_FILE`     | The service provider public certificate file, needed with SAML. | _none_ |
| `SP_KEY_FILE`      | The service provider private key file, typically needed with SAML. | _none_ |
| `SP_KEY_ALGO`      | The algorithm used to sign the requests. | `sha256` |
| `CA_CERT_FILE`     | Path of certificate authority file for service to use when verifying client certificates. | _none_ |
| `DEFAULT_PROTOCOL` | The default authentication protocol to use. Can be `oidc` or `saml`. | `saml` |
| `LOGIN_TIMEOUT`    | How long in seconds to wait for user to successfully authenticate. | `60` |

#### Certificates

For development we use self-signed certificates, and use the service certificate
to sign the client signing request to produce a client certificate. In practice,
both the service and client would use proper certificates and utilize a trusted
certificate authority (CA).

The auth service reads its certificate and key files using the paths defined in
`SP_CERT_FILE` and `SP_KEY_FILE`, respectively. The path for the CA certificate
is read from the `CA_CERT_FILE` environment variable. Providing a CA file is
only necessary if the CA is not one of the root authorities whose certificates
are already installed on the system. Clients accessing the `requests/status/:id`
route will require a valid client certificate signed by the certificate
authority.

### Deploy

#### Overview

The service does not rely on a database, as all data is stored temporarily in
memory. The bulk of the configuration is defined by environment variables. The
service can serve multiple Helix Server installations, as the client initiates
the requests and pulls data as needed.

In terms of availability and load balancing, the service has some state that is
maintained in memory, keyed to an opaque request identifier. The extension
begins the process by asking for a request identifier, and the user logs in
through the service with that request identifier as a parameter. This identifier
is then used to associate the user data with the user logging in via the
extension. As such, it will be necessary to direct all traffic to a single
instance, only switching to a secondary instance when the first has become
unavailable.

#### npm

By far the simplest way to run the authentication service is using `npm start`
from a terminal window. However, that is not robust, as any crash will bring the
service down until it is started again. It would be better to use a process
manager such as [pm2](http://pm2.keymetrics.io),
[forever](https://github.com/foreverjs/forever), or
[StrongLoop](http://strong-pm.io) to start and manage the service. These
typically hook into the system process manager (e.g. `systemd`) and thus will
only go down if the entire system goes down.

#### pm2

The [pm2](http://pm2.keymetrics.io) process manager is quite popular and has
been used for testing this service. An example configuration file is included
with the service itself, named `ecosystem.config.js` in the top-level directory.

## Helix Server Extension

### Requirements

Before installing the loginhook extension, make sure the Helix Server has been
updated to at least the 2019.1 release. This is the release in which extensions
support was added, and the loginhook depends on this feature.

### Certificates

Included with the authentication service files are self-signed certificates used
during development. For production systems, these files should be replaced with
certificates signed by a valid certificate authority (CA).

The Helix Server extension reads the CA certificate from `loginhook/ca.crt` and
the client certificates from `loginhook/client.crt` and `loginhook/client.key`.
These files must be in place at the time the extension is packaged and cannot be
modified without packaging and installing again.

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

To install the extension run the following command in a terminal window:

```shell
$ p4 extension --install loginhook.p4-extension -y
Extension 'Auth::loginhook#1.0' installed successfully.
$ p4 admin restart
```

The `restart` is necessary since `p4d` grooms the authentication mechanisms
during startup. This is true when adding or removing `auth-` related triggers,
as well as when installing or removing the loginhook extension.

### Configure

For the extension to be fully operational, it is necessary to configure it at
both the "global" and "instance" level. See the extensions documentation for an
explanation of that concept.

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

The `Service-URL` field must be changed to the address of the authentication
service by which the Helix Server can make a connection.

The `Auth-Protocol` can be any value supported by the authentication service.
This determines the authentication protocol that SSO users will be using to
authenticate. This setting is optional, as the authentication service will use
its own settings to determine the protocol.

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

| Name              | Description | Default |
| ----------------- | ----------- | ------- |
| `enable-logging`  | Extension will write debug messages to a log if '`true`'. | `false` |
| `non-sso-users`   | Those users who will not be using SSO. | _none_ |
| `non-sso-groups`  | Those groups whose members will not be using SSO. | _none_ |
| `user-identifier` | Trigger variable used as unique user identifier. For example, `fullname`, `email`, or `user`. | `email` |
| `name-identifier` | Field within identity provider user profile containing unique user identifer. | `email` |

##### Debug logging

When enabled, the extension will write debugging logs using the `Perforce.log()`
API. The JSON formatted file will appear under a directory of the form
`<path-to-server>/root/server.extensions.dir/<extension-uuid>/1-data` with the
name `log.json`. You can find the `<extension-uuid>` value by searching the
installed extensions using `p4 extension --list --type=extensions` as a
privileged user.

##### Non-SSO Users

See the **Helix Server** section below for details on configuring non-SSO users.

#### Mapping User Profiles to Perforce Users

Helix user specs have several fields that can be used for matching with the
profile information returned from the identity provider. The extension utilizes
the trigger variables exposed by the server, namely `fullname`, `user`, and
`email`, and the choice is configured in the extension by setting the
`user-identifier` value (default is `email`) in the _instance_ configuration.

On the other side of the mapping is the user profile returned by the identity
provider. Different protocols and providers return different fields, and there
is no one field that works for all. Also, administrators are often free to
adjust the output to suit their needs. As such, the extension has another
_instance_ configuration setting named `name-identifier`, which specifies the
name of the field in the user profile that is to be used in matching with the
Helix user. This defaults to `email` as that field is often available, is
generally unique, and is readily available on the Helix side.

Generally, with SAML, the `name-identifier` extension setting should be given
the value `nameID`, as that field is always present in the user profile returned
from the SAML IdP. Depending on the format of the name identifier, you will need
to select an appropriate value for the `user-identifier`. If the IdP returns a
"user name", and it matches the `User` field in the Perforce user spec, then set
`user-identifier` to `user` in the extension configuration. If the name
identifier is an email address, then use `email` instead of `user`. Although
unlikely to be sufficiently unique, the value of `fullname` may be appropriate
if nothing else works.

For OIDC, oftentimes the user profile includes an `email` field and the server
extension looks for this by default (that is, `name-identifier` defaults to
`email`). Hopefully this value matches the `Email` field of the Perforce user
spec, as the server extension will use `email` for the `user-identifier` by
default.

If you are unsure of the contents of the user profile returned from the identity
provider, enable the debug logging in either the authentication service or the
server extension, and then examine the logs after attempting a login. With the
server extension, simply set the `enable-logging` _instance_ configuration
setting to `true`, attempt a login, and look for the `log.json` file under the
`server.extensions.dir` directory of the Helix depot. For the authentication
service, set the `DEBUG` environment variable to `auth:*`, restart the service,
attempt the login, and look at the output from the service (either in the
console or in a pm2 log file, if you are using pm2).

## Helix Server

As mentioned earlier, the loginhook extension requires Helix Server 2019.1 or
later. Additionally, there are likely other configuration changes that you will
want to make, such as allowing for users that will _not_ be authenticating using
single-sign-on.

### Allowing for non-SSO Users

The process for enabling non-SSO users consists of three steps: 1) enable
database passwords in addition to supporting SSO, 2) set passwords for all
users, and 3) assign users to the non-SSO group.

#### Enable Database Passwords

To allow for database passwords, and to allow for the super user to set the
passwords of users, configure the server using the `p4 configure` command like
so:

```shell
$ p4 configure set auth.sso.allow.passwd=1
``` 

#### Set User Passwords

When the server is running at security level 3, all users must have a valid
password in the database, regardless of the method of authentication. That is,
even SSO users will need a password in the database. That password can be
anything, since the SSO user will never use it, and is best set to something
random. A handy way to set passwords for users (on Linux) would look like this:

```shell
$ yes $(uuidgen) | p4 -u super passwd username
```

#### Assigning non-SSO Users

Once the password fallback has been enabled, indicating which users and/or
groups are _not_ to participate in SSO authentication is configured in the
server extension. Namely the `non-sso-groups` and `non-sso-users` settings
described above; individual users named in `non-sso-users` will not authenticate
using SSO, and likewise with any users who are members of any of the groups
named in `non-sso-groups`.

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

The `restart` is necessary since `p4d` grooms the authentication mechanisms
during startup. Without the restart, the server will report an error about a
missing hook:

```
Command unavailable: external authentication 'auth-check-sso' trigger not found.
```

## SELinux

Both the Helix Server extensions and the Node.js authentication service run on
Linux systems with SELinux enabled and in **enforcing** mode, without any
necessary changes.
