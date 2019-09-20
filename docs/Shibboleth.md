# Shibboleth

## Shibboleth

[Shibboleth](https://www.shibboleth.net) is one of the oldest SAML 2.0
implementations, and freely available under an open source license.

## Initial Setup

Using the [docker image](https://hub.docker.com/r/unicon/shibboleth-idp) create
the initial IdP configuration/customization files. This includes creating the
self-signed certificate to be presented to the client web browser.

```shell
$ cd containers/shibboleth
$ chmod 777 .
$ docker run -it -v $(pwd):/ext-mount --rm unicon/shibboleth-idp init-idp.sh
$ chmod 755 .
$ sudo chmod -R u+rw,g+rw customized-shibboleth-idp
$ mv customized-shibboleth-idp shibboleth-idp
$ openssl req -newkey rsa:2048 -keyout key.pem -x509 -out certificate.pem -nodes -days 365 -subj "/CN=Shibboleth"
$ openssl pkcs12 -inkey key.pem -in certificate.pem -export -out shibboleth-idp/credentials/idp-browser.p12
$ rm key.pem certificate.pem
```

The passwords entered for the certificates must match those defined in the
`docker-compose.yml` file (or vice versa) in order for the Docker container to
function properly.

## Auth Service Configuration

### SAML 2.0

By default the authentication service uses the **redirect** method when sending
authentication requests to the IdP, rather than **POST**. As such, the
`SAML_IDP_SSO_URL` and `SAML_IDP_SLO_URL` settings should be given the
`HTTP-Redirect` versions of the values for the `SingleSignOnService` and
`SingleLogoutService` from the Shibboleth metadata.
