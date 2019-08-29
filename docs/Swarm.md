# Swarm

## Overview

Swarm **2018.3** supports the SAML 2.0 authentication protocol, and since the
auth service can easily act as a SAML identity provider, we can leverage the
service to act as a mediator to other authentication protocols. In this
scenario, Swarm would be configured to use SAML authentication with the auth
service as the IdP, and the auth service would be configured to use some other
authentication protocol, such as OpenID Connect. Swarm would validate and
authenticate the user with Perforce as before, with the auth service and login
extension handling the details behind the scenes.

## Configuration

When specifying the URL for Swarm and for the authentication service, make sure
to use consistent addresses. That is, the authentication service `SVC_BASE_URI`
and the address specified in the Swarm configuration should match. Either they
are both IP addresses or they are both host names. Mixing these will cause the
browser cookies to be inaccessible to the auth service and login will not work
at all. The same is true for the identity provider configuration: its address
for the authentication service (Service Provider) must match the leading part of
the `SVC_BASE_URI` setting.

### Addresses

In the examples below, the `192.168.1.106` address is the Swarm installation,
while `192.168.1.66` is that of the authentication service.

### Swarm

Swarm is configured to use SAML authentication by configuring several settings
in the `data/config.php` file. Below is a simple example:

```php
'saml' => array(
    'header' => 'saml-response: ',
    'sp' => array(
        'entityId' => 'urn:example:sp',
        'assertionConsumerService' => array(
            'url' => 'http://192.168.1.106',
        ),
    ),
    'idp' => array(
        'entityId' => 'urn:auth-service:idp',
        'singleSignOnService' => array(
            'url' => 'https://192.168.1.66:3000/saml/login',
        ),
        'x509cert' => 'MIIDUjCCAjoCCQD72tM......yuSY=',
    ),
),
```

The IdP settings come from the auth service: the `entityId` is hard-coded to
`urn:auth-service:idp`, the SSO URL is `/saml/login` and relative to the address
defined by `SVC_BASE_URI` in the auth service configuration. The value of
`x509cert` should be the contents of the public key, which is the file named in
the `SP_CERT_FILE` setting of the auth service.

### Auth Service

Just as with any other SAML IdP, the auth service must know a little bit about
the service provider that will be connecting to it. This is defined in the
`IDP_CONFIG_FILE` configuration file described in the `Getting_Started.md` file.
In this example, the key would be `urn:example:sp` and its value would be
`http://192.168.1.106/login` (Swarm wants the extra `/login` on the URL). The
service can support multiple Swarm installations, just add more entries to the
`IDP_CONFIG_FILE` configuration as needed (and restart the service).

## Development Setup

### Helix Server

1. Start `p4d` with logging to a file: `p4d -d -r p4root -L log`
1. Enable command logging: `p4 configure set server=2`
1. Create a `super` user and bestow super privileges.
1. Be sure that `super` has a password and has a ticket.
1. Allow non-SSO access: `p4 configure set auth.sso.allow.passwd=1`
1. Install the extensions in the server: `AUTH_URL=https://192.168.1.66:3000 P4PORT=localhost:1666 node hook.js`
1. Ensure extensions service URL is same as what Swarm uses so cookies will work.
1. Set the `name-identifier` to `nameID` if the service is using SAML as the `DEFAULT_PROTOCOL`.
1. Create a `swarm` user that the Swarm instance will be using.
1. Ensure the `swarm` user has admin privileges.
1. Add `swarm` user to `non-sso-users` in extension configuration.
1. Create the test user in p4d that is registered with the IdP.
1. Ensure the test user has a password set in the Helix database.

### Authentication Service

In the configuration file specified by the `IDP_CONFIG_FILE` environment
variable, or the `routes/saml_idp.conf.js` file by default, define the ACS URL
for each Swarm installation, where the key is the SP entity identifier (issuer),
and the value is the ACS URL.

For example:

```javascript
'urn:example:sp': {
  'acsUrl': 'http://192.168.1.106'
}
```

### Swarm Configuration

1. Add `saml` configuration values to `config.php`, must match auth service exactly.
    * `idp.singleSignOnService.url` would look something like `https://192.168.1.66:3000/saml/login`
1. Ensure `x509cert` for `idp` is set to auth service public cert.
1. Set `sso_enabled` under `p4` to `true` in `config.php`
1. Should set `priority` under `log` to `7` to maximize the logging, for debugging.

### Swarm Notes

Use `ssh` as `swarm` user to connect to VM (no ssh access for root).

### Identity Provider

Make sure address of auth service matches what Swarm is using. Must not mix IP
address and host names, cookies/session will be mixed up. Use specific address
(`192.168.1.66:3000`) for both Swarm and the configured identity provider.
