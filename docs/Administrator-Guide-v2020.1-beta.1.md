# Administrator's Guide for Helix Authentication Service

## Overview

The Helix Authentication Service is designed to enable certain Perforce products to integrate with your organization's
[Identity Provider (IdP)](https://en.wikipedia.org/wiki/Identity_provider), such as [Okta (identity management)](https://en.wikipedia.org/wiki/Okta_(identity_management)),
[Ping Identity](https://www.pingidentity.com/en.html), [OneLogin](https://en.wikipedia.org/wiki/OneLogin), or [Cisco Duo Security](https://duo.com/).

This feature supports:

- [Security Assertion Markup Language (SAML)](https://en.wikipedia.org/wiki/Security_Assertion_Markup_Language) and [OpenID Connect (OIDC)](https://en.wikipedia.org/wiki/OpenID_Connect) standards
- [Security-Enhanced Linux (SELinux)](https://en.wikipedia.org/wiki/Security-Enhanced_Linux) enabled in enforcing mode

After reading this document, if you want to use this integration with the Perforce Helix Core Server command-line client (P4) and the Perforce Helix Core GUI client, P4V, see [Next Steps](#next-steps).

Although the same IdP can be used for both authentication with a Perforce Product _and_ authentication with web apps, these two types of authentication are completely separate from each other:

### Perforce Helix authentication

- Authentication with certain Perforce products, such as:
- P4V, the [Helix Core Visual Client](https://www.perforce.com/products/helix-core-apps/helix-visual-client-p4v)
- P4, the [Helix Core command-line client](https://www.perforce.com/products/helix-core-apps/command-line-client)
- P4VS, the [Helix Plugin for Visual Studio](https://www.perforce.com/plugins-integrations/visual-studio-plugin)
- P4EXP, the [Helix Plugin for File Explorer](https://www.perforce.com/plugins-integrations/file-explorer-plugin)
- [Helix ALM](https://www.perforce.com/products/helix-alm) clients
- [Helix Plugin for Eclipse (P4Eclipse)](https://www.perforce.com/plugins-integrations/eclipse-plugin) add-in
- [Helix Plugin for Matlab (P4SL)](https://www.perforce.com/downloads/helix-plugin-matlab-p4sl)

### Web App authentication

- Authentication with web apps, such as Salesforce, Workday, Gmail, JIRA, Box, Splunk, ADP, and so on

### Sequence for Helix Core

![Alt sequence diagram](sequence_diagram.png?raw=true "Sequence for Helix Core")

Note that this diagram indicates that the IdP authentication precedes and is separate from the Helix Core "ticket".
Therefore, when the user logs out of Helix Core, the user is not necessarily logged out from the IdP's perspective.

For Helix ALM clients, instead of a p4 ticket, the user gets a login response.

### SECURITY NOTICE ABOUT LOGGING OUT

Logging out of a Helix Core or Helix ALM client does not invoke a logout with the IdP.
Depending on the IdP, subsequently starting a Helix Core or Helix ALM client might result with the user being logged in again without the user being prompted to provide credentials.

### Download Contents

A single tarball/zip on GitHub.

Contents are:

- Helix Authorization Service source code, written in JavaScript
- Administrator's Guide for Helix Authentication Service, this document

### Prerequisites

You can use Helix Authentication Service with any combination of the following:

- Helix Core Server version 2019.1 or later, assuming you have knowledge of Perforce administration for authentication with tickets - see [Authenticating using passwords and tickets](https://www.perforce.com/manuals/p4sag/Content/P4SAG/DB5-21975.html)
- Helix ALM 2019.4 or later
- Surround SCM 2019.2 or later

#### Helix Authentication Service

- Administrative expertise with the software of your Identity Provider.
- [Node.js](https://nodejs.org/), version 12 or later. (The installation script installs Node.js, version 12)
- (recommended) A process manager for the Node.js runtime, such as [pm2](https://pm2.keymetrics.io/), [forever](https://github.com/foreversd/forever), or [StrongLoop](http://strong-pm.io/).
(The installation script installs pm2)
- A web browser. Any client using the authentication service requires a web browser.
- Any client (even the p4 command-line client) is still required to authenticate through your IdP's website. We recommend that at least one user with super level access use Perforce authentication instead of Helix Authentication Service. See the [Authorizing Access](https://www.perforce.com/manuals/p4sag/Content/P4SAG/security.authorizing.html) in the [Helix Core Server Administrators Guide](https://www.perforce.com/manuals/p4sag/Content/P4SAG/Home-p4sag.html).

### Support

The configuration of the Helix Authentication Service to work with both the Identity Provider (IdP) and the Perforce server product requires an experienced security administrator. This effort might require [assistance from Perforce Support](https://www.perforce.com/support/request-support).

## Installing Helix Authentication Service

### Prerequisites

In addition to [Node.js](https://nodejs.org/), building the application will
require the [Git](https://git-scm.com) command-line client to be installed, in
order for `npm` to collect the application dependencies.

### Installation Script

The installation script will run on CentOS 7, 8, Debian 8, 9, 10, Fedora 31, RHEL 7 and 8, and Ubuntu 16, and 18. This method is preferred as it will install all of the prerequisites as well as the recommended process manager (pm2).

1. Run the `bash` script named `install.sh`, which is provided to set up a Linux-based system for running the authentication service. This script installs Node and the pm2 process manager, and then builds the service dependencies.
1. Modify the service configuration by editing the `ecosystem.config.js` file. Configuration consists of defining the identity provider (IdP) details for either OIDC or SAML, and setting the `SVC_BASE_URI` of the authentication service.
1. (Recommended) For better security, replace the example self-signed SSL certificates with ones signed by a trusted certificate authority.
1. Restart the service as described in the [Restarting the Service](#restarting-the-service) section.

Once the installation script has finished, continue with the configuration steps in the [Configuring Helix Authentication Service](#configuring-helix-authentication-service) section.

Alternatively, the installation of Node.js can be done manually, as described in the following sections.

### Manual Installation

#### CentOS/RHEL 6

The Node.js v12 binaries will not run on CentOS 6, Oracle Linux 6, or RHEL 6, nor will the source code build, due to outdated or missing dependencies. For now, this service will not run on these systems.

#### CentOS/RHEL 7

CentOS, Oracle Linux, and RedHat Enterprise Linux lack Node.js packages of the versions required by this service, but there are packages available from [NodeSource](https://nodesource.com/) that are easy to install.

```shell
$ sudo yum install curl git gcc-c++ make
$ curl -sL https://rpm.nodesource.com/setup_12.x | sudo -E bash -
$ sudo yum install nodejs
```

#### CentOS/RHEL 8

The package for Python changed names in this OS release, and the NodeSource package dependencies for v12 still refer to the original name of `python` (c.f. [issue 990](https://github.com/nodesource/distributions/issues/990)). In the mean time it is possible to force the package to install via the `rpm` command.

```shell
$ sudo yum install curl git gcc-c++ make
$ curl -sL https://rpm.nodesource.com/setup_12.x | sudo -E bash -
$ dnf --repo=nodesource download nodejs
$ sudo rpm -i --nodeps nodejs-12.*.rpm
$ rm -f nodejs-12.*.rpm
```

#### Fedora 31

This release of Fedora provides a compatible version of Node.js, so installation is simple.

```shell
$ sudo dnf install nodejs
```

#### Ubuntu 16, 18

The easiest way to install Node.js on recent Ubuntu releases is using the `snap` command:

```
$ sudo snap install node --channel=12/stable --classic
```

As an alternative, there are packages available from [NodeSource](https://nodesource.com/) that are relatively easy to install.

```shell
$ sudo apt-get install build-essential curl git
$ curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash -
$ sudo apt-get install nodejs
```

#### Other Linux distributions

[Download](https://nodejs.org/en/download/) and install the **Linux Binaries** for Node.js, making sure that the `bin` folder is added to the `PATH` environment variable when installing and starting the service.

### Windows 10 Pro and Windows Server 2019

Download and run the Windows-based installers for [Git](https://git-scm.com) and [Node.js](https://nodejs.org/) LTS, then run `npm install` as described below. Note that the native toolchain, available via [chocolatey](https://chocolatey.org), is _not_ required for the authentication service.

### Installing Module Dependencies

If not using the `install.sh` installation script, then it is necessary to run `npm install` to download the module dependencies for the authentication service. Open a terminal window and change to the directory containing the service code, then run the following `npm` command:

```shell
$ npm install
```

## Configuring Helix Authentication Service

The authentication service is configured using environment variables. Because there are numerous settings, it is easiest to create a file called `.env` that contains all of the settings. If you change the `.env` file while the service is running, the service must be restarted for the changes to take effect. See the [Deploy](#deploy) section below because the choice of process manager affects how environment variables are defined. As an example, environment variables can be defined in the `ecosystem.config.js` file when using the pm2 process manager.

If using a `.env` file, it should be located in the current working directory when the service is started. Typically this is the same directory as the `package.json` file of the service code.

### Restarting the Service

Changing the environment settings will require restarting the service for the changes to take effect:

- If using `npm start`, use `Ctrl-c` to stop the running process, and run `npm start` again.
- If using pm2, use the `pm2 startOrReload ecosystem.config.js` command to gracefully restart.
- If using pm2 and running in production mode (when `NODE_ENV` is set to `production`), use the commands `pm2 kill` and `pm2 start auth-svc` to force the service to restart.

### OpenID Connect settings

| Name | Description |
| ---- | ----------- |
| `OIDC_CLIENT_ID` | The **client identifier** as provided by the OIDC identity provider. |
| `OIDC_CLIENT_SECRET` | The **client secret** as provided by the OIDC identity provider. _The `OIDC_CLIENT_SECRET_FILE` setting is preferred over this setting._ |
| `OIDC_CLIENT_SECRET_FILE` | Path of the file containing the **client secret** as provided by the OIDC identity provider. _This setting should be preferred over `OIDC_CLIENT_SECRET` to prevent accidental exposure of the client secret._ |
| `OIDC_CODE_CHALLENGE_METHOD` | _Optional:_ Specify the authorization code challenge method, either `S256` or `plain`. The default behavior is to detect the supported methods in the OIDC issuer data, but not all identity providers supply this information, in which case this setting will become necessary. |
| `OIDC_ISSUER_URI` | The OIDC provider **issuer** URL. |

OpenID Connect has a discovery feature in which the identity provider advertises various properties via a "discovery document". The URI path will be `/.well-known/openid-configuration` at the IdP base URL, which is described in the [OpenID Connect (OIDC) specification](https://openid.net/specs/openid-connect-discovery-1_0.html). This information makes the process of configuring an OIDC client easier.

The OIDC client identifier and secret are generally provided by the identity provider during the setup and configuration of the application, and this is very particular to each identity provider. For guidance with several popular identity providers, see [Example Identity Provider Configurations](#example-identity-provider-configurations).

As for the OIDC issuer URI, that value is advertised in the discovery document mentioned above, and will be a property named `issuer`. Copy this value to the `OIDC_ISSUER_URI` service setting. Be sure _not_ to use one of the "endpoint" URL values, as those are not the same as the issuer URI.

### SAML settings

| Name | Description | Default |
| ---- | ----------- | ------- |
| `IDP_CERT_FILE` | Path of the file containing the public certificate of the identity provider, used to validate signatures of incoming SAML responses. This is not required, but it does serve as an additional layer of security. | _none_ |
| `SAML_IDP_METADATA_URL` | URL of the IdP metadata configuration in XML format. | _none_ |
| `SAML_IDP_SSO_URL` | URL of IdP Single Sign-On service. | _none_ |
| `SAML_IDP_SLO_URL` | URL of IdP Single Log-Out service. | _none_ |
| `SAML_SP_ENTITY_ID` | The entity identifier (`entityID`) for the Helix Authentication Service. | `https://has.example.com` |
| `SAML_IDP_ENTITY_ID` | The entity identifier (`entityID`) for the identity provider. This is not required, but if provided, then the IdP issuer will be validated for incoming logout requests/responses. | _none_ |
| `IDP_CONFIG_FILE` | Path of the configuration file that defines SAML service providers that will be connecting to the authentication service. | **Note:** When the authentication service is acting as a SAML identity provider, it reads some of its settings from a configuration file in the auth service installation. By default, this file is named `saml_idp.conf.js` and is identified by the `IDP_CONFIG_FILE` environment variable. It is evaluated using the Node.js `require()` |
| `SAML_SP_AUDIENCE` | Service provider audience value for AudienceRestriction assertions. | _none_ |
| `SAML_AUTHN_CONTEXT` | The authn context defines the method by which the user will authenticate with the IdP. Normally the default value works on most systems, but it may be necessary to change this value. For example, Azure may want this set to `urn:oasis:names:tc:SAML:2.0:ac:classes:Password` in certain cases. | `urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport` |
| `SAML_NAMEID_FIELD` | Name of the property in the user profile to be used if nameID is missing, which is likely to be the case when using another authentication protocol (such as OIDC) with the identity provider (such as Okta). | **Note:** Changing the configuration file requires restarting the service because Node caches the file contents in memory.
| `SAML_NAMEID_FORMAT` | The desired NameID format expected from the SAML identity provider. Defaults to `urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified`, and can be set to any of the formats defined in the SAML specifications. | **Note:** If not specified, the service will try email and sub, and if those fail, the service will generate a unique identifier. The value is used as a unique key for the user data. To see the raw user profile returned by the identity provider, enable the debug logging (see the `DEBUG` entry below) and watch for "1-step setting nameID" in the log output. |

SAML identity providers advertise some of this information through their metadata URL. The URL is different for each provider, unlike OIDC. See [Example Identity Provider Configurations](#example-identity-provider-configurations).

When configuring the service as a "service provider" within a SAML identity provider, provide an `entityID` that is unique within your set of registered applications. By default, the service uses the value `https://has.example.com`, which can be changed by setting the `SAML_SP_ENTITY_ID` environment variable.

You may elect to fetch the IdP metadata by setting `SAML_IDP_METADATA_URL`, in which case several other settings _may_ be configured automatically by the service. Exactly which settings are configured automatically depends on what information the IdP advertises via the metadata. These settings include `SAML_IDP_SSO_URL`, `SAML_IDP_SLO_URL`, `SAML_NAMEID_FORMAT`, and the IdP certificate that would be loaded from the file named in `IDP_CERT_FILE`. In the unlikely scenario that the IdP returns data that needs to be modified, that can be achieved by setting the correct value in the appropriate environment variable (e.g. `SAML_NAMEID_FORMAT`).

### Other Settings

| Name | Description | Default |
| ---- | ----------- | ------- |
| `BIND_ADDRESS` | Define the IP address upon which the service will listen for requests. Setting this to `127.0.0.1` (i.e. `localhsot`) means that only processes on the same host can connect, while a value of `0.0.0.0` means requests made against any address assigned to the machine will work. | `0.0.0.0` |
| `DEBUG` | Set to any value to enable debug logging in the service (writes to the console). | _none_ |
| `LOGGING` | Path of a logging configuration file. See the [Logging](#logging) section below. Setting this will override the `DEBUG` setting. | _none_ |
| `FORCE_AUTHN` | If set to any non-empty value, will cause the service to require the user to authenticate, even if the user is already authenticated. For SAML, this means setting the `forceAuthn` field set to true, while for OIDC it will set the `max_age` parameter to `0`. This is not supported by all identity providers, especially for OIDC. | _none_ |
| `SESSION_SECRET` | Password used for encrypting the in-memory session data. | `keyboard cat` |
| `SVC_BASE_URI` | The authentication service base URL visible to end users. Needs to match the application settings defined in IdP configuration. | _none_ |
| `SP_CERT_FILE` | The service provider public certificate file, needed with SAML. | _none_ |
| `SP_KEY_FILE` | The service provider private key file, typically needed with SAML. | _none_ |
| `SP_KEY_ALGO` | The algorithm used to sign the requests. | `sha256` |
| `CA_CERT_FILE` | Path of certificate authority file for service to use when verifying client certificates. | _none_ |
| `CA_CERT_PATH` | Path of directory containing certificate authority files for service to use when verifying client certificates. All files in the named directory will be processed. | _none_ |
| `CLIENT_CERT_CN` | A name or pattern used to match against the **Common Name** in the client certificate used to acquire the user profile data. The patterns supported are described in the [minimatch](https://github.com/isaacs/minimatch) library, with the asterisk (`*`) being the most common wildcard. Examples include `client.example.com`, `*.example.com`, and `*TrustedClient*`. | _none_ |
| `DEFAULT_PROTOCOL` | The default authentication protocol to use. Can be oidc or saml. | `saml` |
| `LOGIN_TIMEOUT` | How long in seconds to wait for user to successfully authenticate. | `60` |

### Logging

The authentication service will, by default, write only HTTP request logs to the console. With the `DEBUG` environment variable set to any value, additional logging will be written to the console. For more precise control, the `LOGGING` environment variable can be used to specify a logging configuration file. The format of the logging configuration file can be either JSON or JavaScript (like the `ecosystem.config.js` file, use an extension of `.json` for a JSON file, and `.js` for a JavaScript file). The top-level properties are listed in the table below.

| Name | Description | Default |
| ---- | ----------- | ------- |
| `level` | Messages at this log level and above will be written to the named transport; follows syslog levels per [RFC5424](https://tools.ietf.org/html/rfc5424), section 6.2.1. Levels in order of priority: `emerg`, `alert`, `crit`, `error`, `warning`, `notice`, `info`, `debug` | _none_ |
| `transport` | Either `console`, `file`, or `syslog` | _none_ |

An example of logging all messages at levels from `debug` up to `emerg`, to the console, is shown below.

```javascript
module.exports = {
  level: 'debug',
  transport: 'console'
}
```

Logging to a named file can be achieved by setting the `transport` to `file`. Additional properties can then be defined within a property named `file`, as described in the table below.

| Name | Description | Default |
| ---- | ----------- | ------- |
| `filename` | Path for the log file. | `auth-svc.log` |
| `maxsize` | Size in bytes before rotating the file. | _none_ |
| `maxfiles` | Number of rotated files to retain. | _none_ |

An example of logging all messages at levels from `warning` up to `emerg`, to a named file, is shown below. This example also demonstrates log rotation by defining a maximum file size and a maximum number of files to retain.

```javascript
module.exports = {
  level: 'warning',
  transport: 'file',
  file: {
    filename: '/var/log/auth-svc.log',
    maxsize: 1048576,
    maxfiles: 10
  }
}
```

Logging to the system logger (i.e. `syslog`) is configured by setting the `transport` to `syslog`. Additional properties can then be defined within a property named `syslog`, as described in the table below. Note that the syslog _program name_ will be `helix-auth-svc` for messages emitted by the authentication service.

| Name | Description | Default |
| ---- | ----------- | ------- |
| `facility` | Syslog facility, such as `auth`, `cron`, `daemon`, `kern`, `mail`, etc. | `local0` |
| `path` | Path of the syslog unix domain socket (e.g. `/dev/log`). | _none_ |
| `host` | Host name of the syslog daemon. | _none_ |
| `port` | Port number on which the syslog daemon is listening. | _none_ |
| `protocol` | Communication protocol, e.g. `tcp4`, `udp4`, `unix`, etc. | _none_ |

An example of logging all messages at levels from `info` up to `emerg`, to the system log, is shown below. This example demonstrates logging to `syslog` on Ubuntu 18, in which the default installation uses a unix domain socket named `/dev/log`.

```javascript
module.exports = {
  level: 'info',
  transport: 'syslog',
  syslog: {
    path: '/dev/log',
    protocol: 'unix'
  }
}
```

### Certificates

Although it is possible to use a self-signed certificate, we recommend that you use proper certificates and a trusted certificate authority (CA).

The Helix Authentication Service reads its certificate and key files using the paths defined in `SP_CERT_FILE` and `SP_KEY_FILE`, respectively. The path for the CA certificate is read from the `CA_CERT_FILE` environment variable. Providing a CA file is only necessary if the CA is not one of the root authorities whose certificates are already installed on the system. Clients accessing the `/requests/status/:id` route will require a valid client certificate signed by the certificate authority.

If the certificate files are changed, the service will need to be restarted because the service only reads the files at startup.

## Deploy

### Overview

Helix Authentication Service does not rely on a database because all data is stored temporarily in memory. The configuration is defined by environment variables. The service can serve multiple Helix Server installations because the client application that interacts with Helix Authentication Service initiates the requests and pulls data as needed. The Helix Core Server Extension asks the service for a request identifier, and the user logs in through the Helix Authentication Service with that request identifier.

### npm

The simplest way to run the Helix Authentication Service is using `npm start` from a terminal window. However, that is not robust because if the service fails, it must be restarted. Therefore, we recommend that you use a Node.js process manager to start and manage the service. 

### Process Managers

Node.js process managers generally offer many advantages over using just `npm` to run a Node.js application. Such managers include [pm2](https://pm2.keymetrics.io/), [forever](https://github.com/foreversd/forever), and [StrongLoop](http://strong-pm.io/). These Node.js process managers typically hook into the system process manager (e.g. `systemd`) and thus will only go down if the entire system goes down.

### pm2

The [pm2](https://pm2.keymetrics.io/) process manager is recommended for deploying this service. Aside from it offering many convenient functions for managing Node.js processes, it also aggregates and rotates log files that capture the output from the service: use the `pm2 logs` command to list the files, and `pm2 info` to get the location of the log files. See the example configuration file, `ecosystem.config.js`, in the top-level of the service installation directory.

## Example Identity Provider Configurations

This section provides details for several hosted identity providers, but is by no means an exhaustive list of supported identity providers.

For every occurrence of `SVC_BASE_URI` in the instructions below, substitute the actual protocol, host, and port for the authentication service (e.g. https://localhost:3000 for development environments). This address must match the URL that the identity provider is configured to recognize as the "SSO" or "callback" URL for the application.

### Auth0

#### OpenID Connect

1. From the admin dashboard, click the **CREATE APPLICATION** button.
2. Enter a meaningful name for the application.
3. Select the **Regular Web Application** button, then click **Create**.
4. Open the _Settings_ tab, copy the _Client ID_ and _Client Secret_ values to `OIDC_CLIENT_ID` and `OIDC_CLIENT_SECRET_FILE` settings in the service configuration.
5. For _Allowed Callback URLs_ add `{SVC_BASE_URI}/oidc/callback`
6. For _Allowed Logout URLs_ add `{SVC_BASE_URI}`
6. Scroll to the bottom of the _Settings_ screen and click the **Advanced Settings** link.
6. Find the _Endpoints_ tab and select it.
6. Open the _OpenID Configuration_ value in a new browser tab to get the raw configuration values.
6. Find _issuer_ and copy the value to `OIDC_ISSUER_URI` in the service config.
6. Close the configuration tab.
6. At the bottom of the page, click the **SAVE CHANGES** button.

#### SAML 2.0

1. From the admin dashboard, click the **CREATE APPLICATION** button.
1. Enter a meaningful name for the application.
1. Select the **Regular Web Application** button, then click **Create**.
1. On the application _Settings_ screen, add `{SVC_BASE_URI}/saml/sso` to the _Allowed Callback URLs_ field.
1. For _Allowed Logout URLs_ add `{SVC_BASE_URI}/saml/slo`
1. At the bottom of the page, click the **SAVE CHANGES** button.
1. Click the _Addons_ tab near the top of the application page.
1. Click the **SAML2 WEB APP** button to enable SAML 2.0.
1. Enter `{SVC_BASE_URI}/saml/sso` for the _Application Callback URL_.
1. Ensure the _Settings_ block looks something like the following:

```javascript
{
  "signatureAlgorithm": "rsa-sha256",
  "digestAlgorithm": "sha256",
  "nameIdentifierProbes": [
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
  ],
  "logout": {
    "callback": "{SVC_BASE_URI}/saml/slo"
  }
}
```

1. Click the **ENABLE** button at the bottom of the page.
1. On the _Usage_ tab of the addon screen, copy the _Identity Provider Metadata: Download_ link and save the value to the `SAML_IDP_METADATA_URL` setting in the service configuration.
1. If you need to set the login and logout URLs directly rather than use the metadata:
    1. On the _Usage_ tab of the addon screen, copy the _Identity Provider Login URL_ to the `SAML_IDP_SSO_URL` setting in the service configuration.
    1. To get the SLO URL you will need to download the metadata and look for the `SingleLogoutService` element, copying the _Location_ attribute value to `SAML_IDP_SLO_URL` in the config.

### Azure Active Directory

#### OpenID Connect

1. Visit the Microsoft Azure portal and select Azure Active Directory.
1. Under **App registrations**, register a new application.
1. You can use a single app registration for both OIDC and SAML.
1. For the redirect URL enter `{SVC_BASE_URI}/oidc/callback`.
1. Copy the _Application (client) ID_ to the `OIDC_CLIENT_ID` environment variable.
1. Open the _OpenID Connect metadata document_ URL in the browser (click **Endpoints** button from app overview page).
1. Copy the _issuer_ URL and enter as the `OIDC_ISSUER_URI` environment variable; if the issuer URI contains `{tenantid}` then replace it with the _Directory (tenant) ID_ from the application overview page.
1. Under _Certificates &amp; Secrets_, click **New client secret**, copy the secret value to the `OIDC_CLIENT_SECRET_FILE` environment variable.
1. Add a user account (guest works well) such that it has a defined email field; for whatever reason, "personal" accounts do not have the "email" field defined.
1. Make sure the user email address matches the user in Active Directory.

#### SAML 2.0

1. Visit the Microsoft Azure portal and select Azure Active Directory.
1. Under **App registrations**, register a new application.
1. You can use a single app registration for both OIDC and SAML.
1. Enter the auth service URL as the redirect URL.
1. Copy the _Application (client) ID_ to the `SAML_SP_ENTITY_ID` environment variable.
1. Open the API endpoints page: click the **Endpoints** button from app overview page.
1. Copy the _Federation metadata document_ value to the `SAML_IDP_METADATA_URL` environment variable.
1. If you need to set the login and logout URLs and name identifier directly rather than use the metadata:
    1. Copy the _SAML-P sign-on_ endpoint value to the `SAML_IDP_SSO_URL` environment variable.
    1. Copy the _SAML-P sign-out_ endpoint value to the `SAML_IDP_SLO_URL` environment variable.
    1. Set the `SAML_NAMEID_FORMAT` environment variable to the value `urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress`
1. Make sure the user email address matches the user in Active Directory.
1. Configure the extension to use `nameID` as the `name-identifier` value.

#### SAML via Gallery Template

1. Visit the Microsoft Azure portal and select Azure Active Directory.
1. Under **Enterprise applications**, register a new application.
1. In the _Add from the gallery_ form, enter `Perforce` and select the _Perforce Helix Core_ application.
1. Click the **Add** button to add the application to the directory.
1. Assign users to the application from the **Users and groups** screen.
1. Start the SAML configuration process from the **Single sign-on** screen.
1. In the _Basic SAML Configuration_ section, configure the required fields:
    1. For the _Entity ID_ enter the value from the `SAML_SP_ENTITY_ID` setting in the service configuration.
    1. For the _Reply URL_ enter `{SVC_BASE_URI}/saml/sso`
    1. For the _Sign on URL_ enter `{SVC_BASE_URI}`
1. Click the **Save** button to save the SAML configuration.
1. From the **Single sign-on** screen, find the _App Federation Metadata Url_ field and copy the value to the `SAML_IDP_METADATA_URL` environment variable.

### Google gSuite

#### SAML 2.0

1. Visit the Google Admin console.
1. Click the **Apps** icon.
1. Click the **SAML apps** button.
1. Click the **Add a service/App to your domain** link.
1. Click the **SETUP MY OWN CUSTOM APP** link at the bottom of the dialog.
1. On the **Google IdP Information** screen, copy the _SSO URL_ and _Entity ID_ values to the `SAML_IDP_SSO_URL` and `SAML_IDP_ENTITY_ID` environment variables.
1. Click the **NEXT** button.
1. For the _ACS URL_ enter `{SVC_BASE_URI}/saml/sso`
1. For the _Entity ID_ enter the value from the `SAML_SP_ENTITY_ID` setting in the service configuration.
1. Click the **NEXT** button, and then **FINISH**, and then **OK** to complete the initial setup.
1. On the **Settings** page for the new application, click the **EDIT SERVICE** button.
1. Change the *Service status* to **ON** to enable users to authenticate with this application.

### Google Identity Platform

#### OpenID Connect

These steps are based on the documented
[procedure](https://developers.google.com/identity/protocols/oauth2/openid-connect)
on the Google Developers web site. Be sure to read those instructions for
complete details.

1. Create or select a project in the [APIs Console](https://console.developers.google.com/).
1. Click on **CREATE CREDENTIALS** button on the _Credentials_ page, select **OAuth client ID**, and then enter a name for the service.
1. For _Application type_ choose **Web Application** and provide a descriptive name.
1. On the next screen, copy the _Client ID_ and _Client Secret_ values to the `OIDC_CLIENT_ID` and `OIDC_CLIENT_SECRET_FILE` service settings.
1. Enter `https://accounts.google.com` for the `OIDC_ISSUER_URI` service setting.
1. From the _Credentials_ page, click on the newly defined credential to open the edit screen.
1. Click the **ADD URI** button under _Authorized redirect URIs_ and enter `{SVC_BASE_URI}/oidc/callback`

### Okta

#### OpenID Connect

1. On the Okta admin dashboard, click the **Create a New application** button (helps to use "classic ui").
1. Select _Web_ as the Platform and _OpenID Connect_ as the Sign on method.
1. Provide a meaningful name on the next screen.
1. For the _Login_ redirect URIs enter `{SVC_BASE_URI}/oidc/callback`
1. For the _Logout_ redirect URIs enter `{SVC_BASE_URI}`
1. On the next screen, find the _Client ID_ and _Client secret_ values and copy to the `OIDC_CLIENT_ID` and `OIDC_CLIENT_SECRET_FILE` service settings.
1. From the _Sign On_ tab, copy the _Issuer_ value to `OIDC_ISSUER_URI`

If you are already logged into Okta, do _one_ of the following:

- assign that user to the application you just created
- log out so you can log in again using the credentials for a user that is assigned to the application.

Otherwise you will immediately go to the "login failed" page, and the only indication of the cause is in the Okta system logs.

#### SAML 2.0

1. On the Okta admin dashboard, click the **Create a New application** button (helps to use "classic ui").
1. Select _Web_ as the Platform and _SAML 2.0_ as the Sign on method.
1. Provide a meaningful name on the next screen.
1. Click **Save** to go to the next screen.
1. For the _Single sign on URL_ enter `{SVC_BASE_URI}/saml/sso`
1. For the _Audience URI_ enter the value from the `SAML_SP_ENTITY_ID` setting in the service configuration.
1. Click the **Show Advanced Settings** link and check the **Enable Single Logout** checkbox.
1. For the _Single Logout URL_ enter `{SVC_BASE_URI}/saml/slo`
1. For the _SP Issuer_ enter the value from the `SAML_SP_ENTITY_ID` setting in the service configuration.
1. For _Signature Certificate_, select and upload the `certs/server.crt` file.
1. Click the **Next** button to save the changes.
1. There may be an additional screen to click through.
1. From the _Sign On_ tab, copy the _Identity Provider metadata_ link to the `SAML_IDP_METADATA_URL` environment variable.
1. If you need to set the login and logout URLs directly rather than use the metadata:
    1. From the _Sign On_ tab, click the **View Setup Instructions** button and copy the values for _IdP SSO_ and _SLO URLs_ to the `SAML_IDP_SSO_URL` and `SAML_IDP_SLO_URL` settings in the environment.
1. Configure the extension to use `nameID` as the `name-identifier` value.
1. Configure the extension to use `user` as the `user-identifier` value.

If you are already logged into Okta, do _one_ of the following:

- assign that user to the application you just created
- log out so you can log in again using the credentials for a user that is assigned to the application.

Otherwise you will immediately go to the "login failed" page, and the only indication of the cause is in the Okta system logs.

### OneLogin

#### OpenID Connect

1. From the admin dashboard, create a new app: search for "OIDC" and select _OpenId Connect (OIDC)_ from the list.
1. On the _Configuration_ screen, enter `{SVC_BASE_URI}/oidc/login` for _Login Url_.
1. On the same screen, enter `{SVC_BASE_URI}/oidc/callback` for _Redirect URI's_.
1. Find the **Save** button and click it.
1. From the _SSO_ tab, copy the _Client ID_ value to the `OIDC_CLIENT_ID` environment variable.
1. From the _SSO_ tab, copy the _Client Secret_ value to `OIDC_CLIENT_SECRET_FILE` (you may need to "show" the secret first before the copy button will work).
1. From the _SSO_ tab, find the **OpenID Provider Configuration Information** link and open in a new tab.
1. Find the _issuer_ and copy the URL value to the `OIDC_ISSUER_URI` environment variable.
1. Ensure the _Application Type_ is set to _Web_.
1. Ensure the _Token Endpoint_ is set to _Basic_.

#### SAML 2.0

1. From the admin dashboard, create a new app: search for "SAML" and select _SAML Test Connector (Advanced)_ from the list.
1. On the _Configuration_ screen, enter the value from the `SAML_SP_ENTITY_ID` service setting into the _Audience_ field.
1. On the same screen, enter `{SVC_BASE_URI}/saml/sso` for _Recipient_.
1. And for _ACS (Consumer) URL Validator_, enter `.*` to match any value.
1. For _ACS (Consumer) URL_, enter `{SVC_BASE_URI}/saml/sso`
1. For _Single Logout URL_, enter `{SVC_BASE_URI}/saml/slo`
1. For _Login URL_, enter `{SVC_BASE_URI}/saml/sso`
1. For _SAML initiator_ select _Service Provider_.
1. Find the *Save* button and click it.
1. From the _SSO_ tab, copy the _Issuer URL_ value to the `SAML_IDP_METADATA_URL` environment variable.
1. If you need to set the login and logout URLs directly rather than use the metadata:
    1. From the _SSO_ tab, copy the _SAML 2.0 Endpoint_ value to the `SAML_IDP_SSO_URL` environment variable.
    1. From the _SSO_ tab, copy the _SLO Endpoint_ value to `SAML_IDP_SLO_URL`.
1. Configure the extension to use `nameID` as the `name-identifier` value.

## Next Steps

If you want to configure Helix Authentication Service for Helix Core Server (P4) and the Helix Core visual client (P4V), see the Administrator's Guide for Helix Authentication Extension, which is available in the "docs" for the [Helix Authentication Extension](https://github.com/perforce/helix-authentication-extension).

If you want to use the Helix Authentication Service to authenticate from Helix ALM or Surround SCM, see the [Helix ALM License Server Admin Guide](https://help.perforce.com/alm/help.php?product=licenseserver&type=lsadmin).

## Upgrading Helix Authentication Service

The upgrade process for the authentication service is essentially the same as installing for the first time, with the addition of copying the configuration and certificate files.

Start by stopping the currently installed and running authentication service. This will make the desired port (the default is `3000`) available and prevent any confusion when starting the upgraded application within a process manager. You may also want to rename the directory containing the service code to indicate it is no longer in use.

Next, download the updated release of the service to a new file location. Do _not_ attempt to upgrade the service "in-place" as that may cause subtle issues, such as unintentionally loading old versions of dependencies. Use the desired installation process as described in the [Installing Helix Authentication Service](#installing-helix-authentication-service) section to prepare the service. If using the `install.sh` installation script, it will detect the previously installed prerequisites (e.g. Node.js) and not install them again. If performing a manual install, be sure to run `npm install` in the authentication service directory to install the module dependencies.

Next, copy the SSL certificates from the old install location to the new one.

Finally, copy the configuration settings from the old install location to the new one. This may be the `.env` file, or if using the pm2 process manager, it would be the `env` section of the `ecosystem.config.js` file; do not copy the entire `ecosystem.config.js` file as there may be changes made to the setup, outside of the `env` section. In either case, if the upgraded service has already been started, you will need to restart it for the configuration changes to take effect.

## Troubleshooting

### OIDC challenge methods not supported

Some OpenID Connect identity providers may not be configured to have a default code challenge method. As a result, user authentication may fail, and the service log file will contain an error like the following:

```
error: oidc: initialization failed: code_challenge_methods_supported is not properly set on issuer ...
```

If this happens, the workaround is to set the `OIDC_CODE_CHALLENGE_METHOD` configuration setting to the value `S256` and then restart the authentication service.

### "Missing authentication strategy" displayed in browser

Check authentication service log files for possible errors. During the initial setup, it is likely that the settings for the protocol (e.g. SAML or OIDC) simply have not been defined as yet. Without the necessary protocol settings, the service cannot initialize the authentication "strategy" (the appropriate [passport](http://www.passportjs.org) module).

### Redirect URI error displayed in browser

In the case of certain identity providers, you may see an error message indicating a "bad request" related to a redirect URI. For instance:

```
Error Code: invalid_request
Description: The 'redirect_uri' parameter must be an absolute URI that
             is whitelisted in the client app settings.
```

This occurs when the authentication service base URI (`SVC_BASE_URI`) does not match what the identity provider has configured for the application. For example, when using an OIDC configuration in Okta, the **Login redirect URIs** must have a host and port that match those found in the `SVC_BASE_URI` environment variable in the service configuration. You may use an IP address or a host name, but you cannot mix them; either both have an IP address or both have a host name.

### Environment settings and unexpected behavior

If the authentication service is not behaving as expected based on the configuration, it may be that it is picking up environment variables from an unexpected location. All of the environment variables will be dumped to the console when debug logging is enabled, so if those do not match expectations, then verify that you are using exactly one of a `.env` file _or_ an `ecosystem.config.js` file. While you can have both, the order of precedence is not defined, and you will likely get unexpected results. In practice, it appears that the `.env` file takes precedence over the `env` section in the `ecosystem.config.js` file, but that is not a safe assumption.

### pm2 caching environment variables

If you remove an environment variable (for instance, by removing it from the `env` section of the `ecosystem.config.js` file) and restart the service, it may be that the pm2 daemon will cache the old value for that variable. This is typically the case when pm2 is running in production or cluster mode (when `NODE_ENV` is set to `production`). To clear the cached values, it is necessary to terminate the pm2 daemon (`pm2 kill`) and then start the service again (`pm2 start auth-svc`).

### pm2 restart seems to have no effect

After modifying the `ecosystem.config.js` file and restarting pm2, if the changes still do not seem to be taking effect, then make sure you are running the pm2 command as the same user that started pm2 initially. This situation will arise when installing the authentication service on CentOS using the service packages. The post-installation step installs and starts pm2 as the `root` user, and not the user account that was performing the install. If this is the case, stop the pm2 instance started by the non-root user, then restart the other pm2 instance as the root user.
