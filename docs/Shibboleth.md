# Shibboleth

This document is intended for developers who are setting up an instance of the Shibboleth SAML IdP for testing the P4 Authentication Service. [Shibboleth](https://www.shibboleth.net) is one of the oldest SAML 2.0 implementations, and freely available under an open source license.

## Requirements

To use the Docker containers defined in this project, you will need a
[Docker](https://www.docker.com) installation, which should include Docker
Compose (`docker compose`) to build and manage the containers. Host systems that
are not Linux will likely need Docker Desktop as well.

## Initial Setup

See the comments in `containers/shibboleth/Dockerfile` as to how the image was built, which should offer some guidance when the time comes to update to a newer version of Shibboleth.

## Build and Start

```shell
$ docker compose up --build -d
```

### Testing Shibboleth

The SAML IdP metadata URL will be: https://shibboleth.doc:4443/idp/shibboleth

Use `docker compose logs shibboleth.doc` to see the logs of the Shibboleth
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
