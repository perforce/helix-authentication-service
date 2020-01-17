[![Support](https://img.shields.io/badge/Support-Official-green.svg)](mailto:support@perforce.com)

# Helix Authentication Service

This [Node.js](http://nodejs.org) based application implements a simple
authentication protocol integration service that may be used in concert with
systems wanting to permit users to authenticate with external identity systems.
It currently supports the OpenID Connect and SAML 2.0 authentication protocols.

## Overview

### Architecture

The service itself is a simple Node.js web application that leverages several
open source libraries to interact with standards-based authentication providers.
This can be installed and run anywhere on the network, as long as it is
reachable from any clients that will be using this service.

When an end user attempts to access a configured system, that system will direct
the user to the authentication service using their default web browser. From
there the service will redirect to the configured identity provider (IdP), where
the user will authenticate. Upon successful authentication, the system that
initiated the login request will receive the validated user profile, at which
point the system can give access to the user.

This design lends itself well to integrating other authentication protocols,
including custom schemes developed by authentication providers such as
[Auth0](http://auth0.com/) -- just add `passport-auth0` as a Node dependency,
add a new route to the service, and configure the extension to use the new
protocol.

### Provider Support

The authentication service has been tested with the following identity providers:

| Provider                              | OIDC | SAML |
| ------------------------------------- | ---- | ---- |
| [Auth0](https://auth0.com)            | OK   | OK   |
| [Azure](https://azure.microsoft.com)  | OK   | OK   |
| [Okta](https://www.okta.com)          | OK   | OK   |
| [OneLogin](https://www.onelogin.com)  | OK   | OK   |
| [Ping](https://www.pingidentity.com/) | OK   | OK   |

### Node.js Version Support

The `master` branch of this repository requires Node.js v12, the Long Term
Support release. To use the service with Node.js v10 requires checking out the
`node10` branch. That branch is provided for those situations where Node v12 is
not available, as with CentOS/RHEL 6, and upgrading the OS is not feasible. The
drawback is that the version of the `openid-client` module that supports Node
v10 does not have the features and bug fixes of the more recent releases.
Support for Node v10 is temporary and will likely be removed in the future.

## Documentation

See the product documentation in the [docs](./docs) directory.

## How to Get Help

Configuring the extension, the authentication service, and the identity provider
is a non-trivial task. Some expertise with security systems is helpful. In the
event that you need assistance with configuring these systems, please contact
[Perforce Support](https://www.perforce.com/support/request-support).

## Development

See the [development](./docs/Development.md) page for additional information
regarding building and testing the service.

## REST API

In the descriptions below, the `${baseUrl}` is the URL configured in the
`SVC_BASE_URI` setting in the authentication service.

The steps involved in processing an authentication event would go something like
this:

1. Client does a `GET` on `/requests/new/:userId`
1. Service responds with JSON-formatted request data, including a `request` identifier and a `loginURL`
1. Client directs user to open the provided `loginUrl` in their browser
1. User authenticates with IdP, with auth service acting as the SP/RP
1. Meanwhile, client does a `GET` on `/requests/status/:requestId`
1. Service eventually responds with JSON-formatted user data

### /requests/new

#### GET ${baseUrl}/requests/new/:userId

This is the starting point for the user authentication process. The **:userId**
_route parameter_ can be any unique value that the client wishes to use for
identifying the user. The service responds with a JSON body that contains a
request identifier and URLs for the user to log in.

#### Request Parameters

| Parameter  | Description | Param Type | Data Type |
| ---------- | ----------- | ---------- | --------- |
| forceAuthn | If set to a _truthy_ value, forces user authentication regardless of session status. | Query | String |

#### Parameter Details

* `forceAuthn` may be added to instruct the service to signal the IdP to require the user to provide their credentials, even if the user already has a valid login session. The value, if any, should be any positive number, or a non-empty string; anything that JavaScript would consider a "true" value.

#### Request Examples

```shell
$ curl -k https://auth-service/requests/new/repoman?forceAuthn=1
```

In this example, the **:userId** route parameter is given as `repoman`, and the
`forceAuth` query parameter is specified using a "truthy" value.

#### Response Examples

```json
{
    "request": "01DMKW0EFPKJFGY4PT7B4N0F4J",
    "loginUrl": "https://auth-service/saml/login/01DMKW0EFPKJFGY4PT7B4N0F4J",
    "baseUrl": "https://auth-service"
}
```

### /requests/status

The `/requests/status` route returns the user profile data. Accessing this
endpoint requires client certificates, which prevents unauthorized access to
user data. How the client maps the user data returned from the service to user
accounts is entirely application and protocol dependent

#### GET ${baseUrl}/requests/status/:requestId

The **:requestId** _route parameter_ is replaced with the identifier given in
the `request` field of the JSON response from the `/requests/new` endpoint. The
request will take as long as necessary for the user to authenticate with the
identity provider. By default the service will time out after 1 minute; this can
be configured using the `LOGIN_TIMEOUT` setting.

The user profile data returned by the service depends on whatever the identity
provider returns. The service knows nothing about the user or the clients
initiating a login. It does, however, attempt to combine commonly available
fields into a canonical form to make it easier for the client to get the
relevant information. For instance, with the SAML protocol, the service will
attempt to set a property called `nameID` to something sensible, if the property
has not already been defined by the IdP (see the `SAML_NAMEID_FIELD` setting).

#### Possible Error Responses

| Code | Reason |
| ---- | ------ |
| 401  | The request did not include the required client certificates. |
| 403  | The client certificates provided did not match the CA records. |
| 404  | The given request identifier is not recognized (they can time out). |
| 408  | The user login process took longer than the configured timeout period. |

#### Request Examples

```shell
$ curl -k --cert client.crt --key client.key https://auth-service/requests/status/01DMKW0EFPKJFGY4PT7B4N0F4J
```

In this example, the **:requestId** route parameter has been given as the
request identifier from the example above.

#### Response Examples

The following example is the result of authenticating with Okta using SAML:

```json
{
    "nameID": "repoman@example.com",
    "nameIDFormat": "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
    "sessionIndex": "_443f9b1c4627383b0e42"
}
```

This example shows what Okta would return when using OpenID Connect:

```json
{
    "sub": "00u15xtrad5QDzt1D357",
    "name": "Repo Man",
    "locale": "en-US",
    "email": "repoman@example.com",
    "preferred_username": "repoman",
    "given_name": "Repo",
    "family_name": "Man",
    "zoneinfo": "America/Los_Angeles",
    "updated_at": 1566419389,
    "email_verified": true
}
```
