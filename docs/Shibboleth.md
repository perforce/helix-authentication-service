# Shibboleth

## Overview

[Shibboleth](https://www.shibboleth.net) is one of the oldest SAML 2.0
implementations, and freely available under an open source license. This
document describes how the Docker container for Shibboleth was created and
configured for testing with the authentication service. It may also be helpful
as a guide for the configuration changes that are needed to use the
authentication service.

## Requirements

To use the Docker containers defined in this project, you will need a
[Docker](https://www.docker.com) installation, which should include Docker
Compose (`docker-compose`) to build and manage the containers. Host systems that
are not Linux will likely need Docker Desktop as well.

## Initial Setup

This section documents how the Docker container and its customization was
initially created. To start the container, skip to the next section.

Use the [docker image](https://hub.docker.com/r/unicon/shibboleth-idp) to create
the initial IdP configuration/customization files. This includes creating the
self-signed certificate to be presented to the client web browser.

```shell
$ cd containers/shibboleth
$ chmod 777 .
$ docker run -it -v $(pwd):/ext-mount --rm unicon/shibboleth-idp init-idp.sh
$ chmod 755 .
$ sudo chmod -R u+rw,g+rw customized-shibboleth-idp
$ mv customized-shibboleth-idp shibboleth-idp
$ mv shibboleth-idp/conf/attribute-resolver-ldap.xml shibboleth-idp/conf/attribute-resolver.xml
$ openssl req -newkey rsa:2048 -keyout key.pem -x509 -out certificate.pem -nodes -days 365 -subj "/CN=Shibboleth"
$ openssl pkcs12 -inkey key.pem -in certificate.pem -export -out shibboleth-idp/credentials/idp-browser.p12
$ rm key.pem certificate.pem
$ cp ../../certs/server.crt shibboleth-idp/credentials/metaroot.pem
```

The passwords entered for the certificates must match those defined in the
`docker-compose.yml` file (or vice versa) in order for the Docker container to
function properly.

### Configuring Shibboleth

#### LDAP Configuration

Edit the `shibboleth-idp/conf/ldap.properties` file, ensuring the following are
set like so (this configures how Shibboleth connects to the OpenLDAP container):

```conf
idp.authn.LDAP.authenticator                   = bindSearchAuthenticator

idp.authn.LDAP.ldapURL                         = ldap://ldap.doc:389
idp.authn.LDAP.useStartTLS                     = false
idp.authn.LDAP.useSSL                          = false

idp.authn.LDAP.returnAttributes                 = *

idp.authn.LDAP.baseDN                           = ou=people,dc=example,dc=org
idp.authn.LDAP.userFilter                       = (uid={user})
idp.authn.LDAP.bindDN                           = cn=admin,dc=example,dc=org
idp.authn.LDAP.bindDNCredential                 = admin

idp.authn.LDAP.dnFormat                         = uid=%s,ou=people,dc=example,dc=org

idp.attribute.resolver.LDAP.authenticator       = %{idp.authn.LDAP.authenticator}
idp.attribute.resolver.LDAP.ldapURL             = %{idp.authn.LDAP.ldapURL}
idp.attribute.resolver.LDAP.baseDN              = %{idp.authn.LDAP.baseDN:undefined}
idp.attribute.resolver.LDAP.bindDN              = %{idp.authn.LDAP.bindDN:undefined}
idp.attribute.resolver.LDAP.bindDNCredential    = %{idp.authn.LDAP.bindDNCredential:undefined}
idp.attribute.resolver.LDAP.searchFilter        = (uid=$resolutionContext.principal)
idp.attribute.resolver.LDAP.useStartTLS         = false
```

#### Metadata

Edit the `shibboleth-idp/conf/metadata-providers.xml` file, adding the following:

```xml
<MetadataProvider id="HTTPMetadata"
                  xsi:type="FileBackedHTTPMetadataProvider"
                  backingFile="%{idp.home}/metadata/auth-svc.xml"
                  disregardTLSCertificate="true"
                  metadataURL="https://auth-svc.doc:3000/saml/metadata">
    <MetadataFilter xsi:type="SignatureValidation"
                    requireSignedRoot="false"
                    certificateFile="%{idp.home}/credentials/metaroot.pem" />
    <MetadataFilter xsi:type="EntityRoleWhiteList">
        <RetainedRole>md:SPSSODescriptor</RetainedRole>
    </MetadataFilter>
</MetadataProvider>
```

This directs Shibboleth to fetch the service provider SAML metadata directly
from our service instance, verifying it using the certificate we copied in
earlier (i.e. `shibboleth-idp/credentials/metaroot.pem`).

#### SAML NameID

Edit the `shibboleth-idp/conf/saml-nameid.xml` file as follows:

1. Uncomment the `<ref bean="shibboleth.SAML2TransientGenerator" />` in the
   `<util:list id="shibboleth.SAML2NameIDGenerators">` block.
1. Uncomment the block that defines `SAML2AttributeSourcedGenerator`,
   and add the attribute `p:useUnfilteredAttributes="true"` (because trying
   to get the attribute filter set correctly is tricky).

## Build and Start

```shell
$ docker-compose build
$ docker-compose up -d
```

### Testing Shibboleth

The SAML IdP metadata URL will be: https://shibboleth.doc/idp/shibboleth

Use `docker-compose logs shibboleth.doc` to see the logs of the Shibboleth
server. It takes around 10 seconds on a fast machine to complete its startup. If
there are any Java exceptions in the log, then there is trouble. Otherwise, it
is working.

To open the Shibboleth landing page, open the `https://hostname/idp` URL in your
browser. If you are using Docker Desktop, then `hostname` will be `localhost`.

## Auth Service Configuration

### SAML 2.0

By default the authentication service uses the **redirect** method when sending
authentication requests to the IdP, rather than **POST**. As such, the
`SAML_IDP_SSO_URL` and `SAML_IDP_SLO_URL` settings should be given the
`HTTP-Redirect` versions of the values for the `SingleSignOnService` and
`SingleLogoutService` from the Shibboleth metadata.
