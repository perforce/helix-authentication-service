# Swarm

## Development Setup

### Helix Server

1. Start `p4d` with logging to a file: `p4d -d -r p4root -L log`
1. Enable command logging: `p4 configure set server=2`
1. Create a `super` user and bestow super privileges.
1. Allow non-SSO access: `p4 configure set auth.sso.allow.passwd=1`
1. Install the extensions in the server: `AUTH_URL=https://192.168.1.66:3000 P4PORT=localhost:1666 node hook.js`
1. Ensure extensions service URL is same as what Swarm uses so cookies will work.
1. Set the `name-identifier` to `nameID` if using Okta IdP.
1. Create a `swarm` user that the Swarm instance will be using.
1. Add `swarm` user to `non-sso-users` in extension configuration.
1. Create the test user in p4d that is registered with the IdP.

The Swarm configuration script will ensure the `super` and `swarm` users are in
a group called `admins` that has an unlimited password timeout.

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

1. Get a ticket for `swarm` user and set value in `config.php` as `password`
1. Modify protections to give `swarm` admin privileges: `admin user swarm * //...`
1. Add `saml` configuration values to `config.php`, must match auth service exactly.
    * `idp.singleSignOnService.url` would look something like `https://192.168.1.66:3000/saml/login`
1. Ensure `x509cert` for `idp` is set to auth service public cert.
1. Set `sso_enabled` to `true` in `config.php`

#### Notes

Use `ssh` as `swarm` user to connect to VM (no ssh access for root).

### Identity Provider

Make sure address of auth service matches what Swarm is using. Must not mix IP
address and host names, cookies/session will be mixed up. Use specific address
(`192.168.1.66:3000`) for both Swarm and Okta.
