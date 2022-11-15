# REST API

## Overview

The REST API of the authentication service is intended only for application use,
it is _not_ meant for end-users to interact with the service. Users should be
authenticating with the application (such as Helix Core Server, Hansoft, Helix
ALM) which will in turn utilize this API.

### Authentication

The steps involved in processing an authentication event would go something like
this:

1. Client sends a `GET` request to `/requests/new/:userId`
1. Service responds with JSON-formatted request data, including a `request` identifier and a `loginUrl`
1. Client directs user to open the provided `loginUrl` in their browser
1. User authenticates with IdP, with auth service acting as the SP/RP
1. Meanwhile, client sends a `GET` request to `/requests/status/:requestId`
1. Service eventually responds with JSON-formatted user data

### Administration

The adminstrative (REST) interface to the service consists of two sets of endpoints, one named `/tokens` and the other being `/settings`, with the former providing a JSON Web Token (as described in [RFC 7519](https://datatracker.ietf.org/doc/html/rfc7519)) needed by the latter. The steps involved in administering the service would look something like this:

1. Pass the administrative user's credentials via `POST /tokens` and receieve the JWT in the response body. The remaining operations will require the JWT to be passed as a bearer token.
1. Retrieve the configurable settings via `GET /settings`
1. Update some or all of the settings via `POST /settings`
1. Refresh the service to apply the new settings via `POST /settings/apply`
1. End the administrative session by deleting the JWT from the in-memory registry via `DELETE /tokens`

## Routes

### /requests/new

#### GET /requests/new/:userId

This is the starting point for the user authentication process. The **:userId**
_route parameter_ can be any unique value that the client wishes to use for
identifying the user. The service responds with a JSON body that contains a
request identifier and URLs for the user to log in. **Note:** The login URL will
contain a query parameter that is helpful for rule-based routing with a load
balancer. This parameter should be preserved when providing the login URL to the
user.

#### Request Parameters

| Parameter  | Description | Param Type | Data Type |
| ---------- | ----------- | ---------- | --------- |
| forceAuthn | If set to a _truthy_ value, forces user authentication regardless of session status. | Query | String |

#### Parameter Details

* `forceAuthn` may be added to instruct the service to signal the IdP to require
  the user to provide their credentials, even if the user already has a valid
  login session. The value, if any, should be any positive number, or a
  non-empty string; anything that JavaScript would consider a "true" value.

#### Request Example

```shell
$ curl -k https://auth-service/requests/new/repoman?forceAuthn=1
```

In this example, the **:userId** route parameter is given as `repoman`, and the
`forceAuth` query parameter is specified using a "truthy" value.

#### Response Example

```json
{
    "request": "01DMKW0EFPKJFGY4PT7B4N0F4J",
    "loginUrl": "https://auth-service/saml/login/01DMKW0EFPKJFGY4PT7B4N0F4J?instanceId=auth1",
    "baseUrl": "https://auth-service",
    "instanceId": "auth1"
}
```

### /requests/status

The `/requests/status` route returns the user profile data. Accessing this
endpoint requires client certificates, which prevents unauthorized access to
user data. How the client maps the user data returned from the service to user
accounts is entirely application and protocol dependent

**Note:** Requests for the `status` should include a query parameter named `instanceId` whose value is the one provided in the response to `/requests/new` as this _may_ be used by a load balancer to route the request to the appropriate instance of the service.

#### GET /requests/status/:requestId

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

#### Request Example

```shell
$ curl -k --cert client.crt --key client.key https://auth-service/requests/status/01DMKW0EFPKJFGY4PT7B4N0F4J
```

In this example, the **:requestId** route parameter has been given as the
request identifier from the example above.

#### Response Example

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

### /settings

#### GET /settings

Retrieve all of the settings that have defined values. The JSON Web Token from `/tokens` must be provided as a bearer token via the `Authorization` header.

Note that certain settings will not be returned via this endpoint, including `ADMIN_ENABLED`, 
`ADMIN_PASSWD_FILE`, and `ADMIN_USERNAME`.

#### Request Headers

| Name | Description |
| ---- | ----------- |
| `Authorization` | `Bearer ` plus the JSON web token from `/tokens` |

#### Request Example

```shell
curl -k --oauth2-bearer eyJ.<snip>.glw https://auth-service/settings
```

#### Response Example

```json
{
    "OIDC_CLIENT_ID": "client_id",
    "OIDC_CLIENT_SECRET": "client_secret",
    "OIDC_ISSUER_URI": "https://oidc.example.com",
    "SAML_IDP_METADATA_URL": "https://saml.example.com",
    "DEBUG": "1",
    "DEBUG_PROXY": "1",
    "SVC_BASE_URI": "https://has.example.com",
    "DEFAULT_PROTOCOL": "oidc",
    "CA_CERT_FILE": "certs/ca.crt"
}
```

### /settings

#### POST /settings

Update some or all of the settings with new values. The JSON Web Token from `/tokens` must be provided as a bearer token via the `Authorization` header. The new settings are to be provided via the request body in JSON format.

Note that certain settings cannot be modified via this endpoint, including `ADMIN_ENABLED`, 
`ADMIN_PASSWD_FILE`, and `ADMIN_USERNAME`.

Note that calling this endpoint will overwrite the `.env` file, completely wiping out any comments.

#### Request Headers

| Name | Description |
| ---- | ----------- |
| `Authorization` | `Bearer ` plus the JSON web token from `/tokens` |
| `Content-Type` | Always `application/json` |

#### Request Example

```shell
curl -k --oauth2-bearer eyJ.<snip>.glw -X POST -H 'Content-Type: application/json' -d '{"DEFAULT_PROTOCOL":"saml"}' https://auth-service/settings
```

#### Response Example

The response body will be `{"status": "ok"}` unless an error occurred.

### /settings/apply

#### POST /settings/apply

Cause the service to gracefully reload such that the modified settings will take effect.

#### Request Headers

| Name | Description |
| ---- | ----------- |
| `Authorization` | `Bearer ` plus the JSON web token from `/tokens` |

#### Request Example

```shell
curl -k --oauth2-bearer eyJ.<snip>.glw -X POST https://auth-service/settings/apply
```

#### Response Example

The response body will be `{"status": "ok"}` unless an error occurred.

### /tokens

#### POST /tokens

This is the starting point for the administration process, which taking the admin's credentials and returning a JSON Web Token to be used as bearer token as described in [RFC 6750](https://datatracker.ietf.org/doc/html/rfc6750). The admin user's credentials must be provided via the URL-encoded request body as described in Section 4.3 of [RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749). The response body will be JSON formatted and include the token in the `access_token` property. The JSON web token has an expiration time, but it is still recommended to send `DELETE /tokens` when finished.

#### Request Parameters

| Parameter | Description | Param Type | Data Type |
| --------- | ----------- | ---------- | --------- |
| `grant_type` | Always `password` | Query | String |
| `username` | The administrator's username | Query | String |
| `password` | The administrator's password | Query | String |
| `state` | Optional: the value will be passed back in the response body. | Query | String |

#### Request Example

```shell
$ curl -k -X POST -d grant_type=password -d username=scott -d password=tiger https://auth-service/tokens
```

#### Response Example

```json
{
    "token_type": "bearer",
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.<snip>.F0wCh_32WaFe_JDA7n9yU1aiHgOqP6ebXCbc15v5UBA",
    "expires_in": 3600
}
```

### /tokens

#### DELETE /tokens

This will invalidate the registered JSON web token, thus ending the administrative session. The JWT must be provided as a bearer token (via the `Authorization` header). While the JWT already has an expiration time, it is still good practice to "logout" when administration is finished.

#### Request Headers

| Name | Description |
| ---- | ----------- |
| `Authorization` | `Bearer ` plus the JSON web token from `/tokens` |

#### Request Example

```shell
curl -k --oauth2-bearer eyJ.<snip>.glw -X DELETE https://auth-service/tokens
```

#### Response Example

The response body will be `{"status": "ok"}` unless an error occurred.
