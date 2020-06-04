# Swarm

## Overview

Swarm **2018.3** and later support the SAML 2.0 authentication protocol, and
since the authentication service can act as a SAML identity provider, the
service can be used as a mediator to other authentication protocols on behalf of
Swarm. In such a scenario, Swarm would be configured to use SAML authentication
with the authentication service as the IdP, and the authentication service would
be configured to use some other authentication protocol, such as OpenID Connect.
Swarm will validate and authenticate the user with Perforce as before, with the
authentication service and login extension handling the verification.

## Configuration

### Service Address Consistency

When specifying the URL of the Helix Authentication Service, make sure to use a
consistent address. That is, the authentication service `SVC_BASE_URI` and the
address specified in the Swarm configuration should match. Either they are both
IP addresses or they are both host names. Mixing these will cause the browser
cookies to be inaccessible to the authentication service and login will silently
fail. The same is true for the identity provider configuration: its address for
the authentication service (Service Provider) must match the leading part of the
`SVC_BASE_URI` setting.

### Swarm

Instructions for configuring single-sign-on in Swarm is found in the Swarm
[documentation](https://www.perforce.com/manuals/swarm/Content/Swarm/admin-saml_php_config.html)
on the Perforce web site.

When using HAS as the SAML IdP, the `url` setting under
`idp/singleSignOnService` should be set to the value of the `SVC_BASE_URI`
setting plus `/saml/login` -- see the example below.

Also under `idp/singleSignOnService`, the value of `x509cert` should be the
contents of the public key of the authentication service, which is the file
named in the `SP_CERT_FILE` setting. The contents should be collapsed into a
single line of text without the `-----BEGIN CERTIFICATE-----` header and
`-----END CERTIFICATE-----` footer text.

#### Example `config.php`

In the example `config.php` shown below, the authentication service is reachable
at `https://has.example.com:3000`, which would also be the value of the
`SVC_BASE_URI` setting, and Swarm is reachable at `http://swarm.example.com` on
the default port.

```php
'saml' => array(
    'header' => 'saml-response: ',
    'sp' => array(
        'entityId' => 'urn:example:sp',
        'assertionConsumerService' => array(
            'url' => 'http://swarm.example.com',
        ),
    ),
    'idp' => array(
        'entityId' => 'urn:auth-service:idp',
        'singleSignOnService' => array(
            'url' => 'https://has.example.com:3000/saml/login',
        ),
        'x509cert' => 'MIIDUjCCAjoCCQD72tM......yuSY=',
    ),
),
```

The `entityId` for the IdP is hard-coded to `urn:auth-service:idp` and cannot be
changed without modifying the authentication service source code.

### Authentication Service

The authentication service must be configured to know about the service provider
(Swarm) that will be connecting to it. This is defined in the `IDP_CONFIG_FILE`
configuration file described in the HAS administrator's guide. In this example,
the key would be `urn:example:sp` and its value would be
`http://swarm.example.com/login` (Swarm wants the extra `/login` on the URL).

The service can support multiple Swarm installations, simply add more entries to
the `IDP_CONFIG_FILE` configuration as needed (and restart the service).
