# Helix TeamHub

## Overview

TeamHub does not authenticate with Helix using SAML, so for now there is not
much that can be done in terms of integration with the authentication service.
This document serves as a guide for that time when TeamHub will support SAML
authentication _with_ Helix, a la Swarm. That is, using a SAML IdP to get an
authenticated user profile and sending the SAML response to Helix to acquire a
valid ticket.

## Configuration

When specifying the URL for HTH and for the authentication service, make sure
to use consistent addresses. That is, the authentication service `SVC_BASE_URI`
and the address specified in the HTH configuration should match. Either they
are both IP addresses or they are both host names. Mixing these will cause the
browser cookies to be inaccessible to the auth service and login will not work
at all. The same is true for the identity provider configuration: its address
for the authentication service (Service Provider) must match the leading part of
the `SVC_BASE_URI` setting.

### TeamHub

**TODO**

### Auth Service

Just as with any other SAML IdP, the auth service must know a little bit about
the service provider that will be connecting to it. This is defined in the
`IDP_CONFIG_FILE` configuration file described in the documentation on
Confluence. In this example, the key would be `urn:example:sp` and its value
would be `http://192.168.1.106/`. The service can support multiple TeamHub
installations, just add more entries to the `IDP_CONFIG_FILE` configuration as
needed (and restart the service).

## Development Setup

### Helix Server

1. Start `p4d` with logging to a file: `p4d -d -r p4root -L log`
1. Enable command logging: `p4 configure set server=2`
1. Create a `super` user and bestow super privileges.
1. Be sure that `super` has a password and has a ticket.
1. Allow non-SSO access: `p4 configure set auth.sso.allow.passwd=1`
1. Install the extensions in the server: `AUTH_URL=https://192.168.1.66:3000 P4PORT=localhost:1666 node hook.js`
1. Ensure extensions service URL is same as what HTH uses so cookies will work.
1. Set the `name-identifier` to `nameID` if using Okta IdP.
1. Create a `HTH` user that the HTH instance will be using.
1. Add `HTH` user to `non-sso-users` in extension configuration.
1. Create the test user in p4d that is registered with the IdP.

The HTH configuration script will ensure the `super` and `HTH` users are in
a group called `admins` that has an unlimited password timeout.

### Authentication Service

In the configuration file specified by the `IDP_CONFIG_FILE` environment
variable, or the `routes/saml_idp.conf.js` file by default, define the ACS URL
for each HTH installation, where the key is the SP entity identifier (issuer),
and the value is the ACS URL.

For example:

```javascript
'http://localhost:8080/account/saml/hth/metadata': {
  acsUrl: 'http://localhost:8080/account/saml/hth/consume'
}
```

### TeamHub Configuration

In preparation for configuring HTH for SAML, collect the SAML IdP details from
the authentication service by visiting `https://auth-service/saml/idp/metadata`
in your browser (where `auth-service` is the host and port of the auth service).
In particular, get the `SingleSignOnService` URL, which will be used as the
*IdP SSO URL* setting in HTH.

1. Use the full "combo" version of HTH (not the trial version). The trial version does not support other Helix Server installations.
1. Log in to the administrative interface of HTH.
1. Change the **Hostname** in the **Preferences** to whatever is resolvable for your environment (e.g. `localhost:8080`).
1. Do **not** change to use Helix authentication in the admin interface, otherwise a) you cannot use SAML, and b) you cannot change it back.
1. Log in as an administrator to the HTH application (not the admin interface), and find the company settings.
1. In the "Authentication" section, enable the SAML option.
1. Paste the `SingleSignOnService` URL from the IdP metadata to the *IdP SSO URL* setting.
1. Copy the entire contents of the `certs/sp.crt` file into the *IdP Certificate* setting.
1. Click on the **Save** button to commit the changes.

You can now try logging into HTH using the "external authentication" option.

### Identity Provider

Make sure address of auth service matches what HTH is using. Must not mix IP
address and host names, cookies/session will be mixed up. Use specific address
(`192.168.1.66:3000`) for both HTH and Okta.
