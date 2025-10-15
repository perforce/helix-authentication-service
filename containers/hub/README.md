# Overview

This image contains a [Node.js](http://nodejs.org) based application that
provides an authentication protocol integration service that may be used in
concert with Perforce products. It currently supports the OpenID Connect and
SAML 2.0 authentication protocols.

## Tags

Official releases will have version numbers of the form `YYYY.N`, such as
`2019.1`, `2020.1`, or `2020.2`. Patch releases will have version numbers with
three dot separated numbers, such as `2020.1.1` or `2019.1.2`.

## Documentation

To learn about the architecture, supported products and identity providers, as well as the configuration steps for the current version, see the <a href="https://www.perforce.com/manuals/helix-auth-svc/" target="_blank">P4 Authentication Service Documentation</a>.

## How to use this image

### Docker CLI

The following are some examples of how to run the authentication service using
Docker. The first and simplest option would be to use the Docker CLI to start
the container:

```shell
$ docker run -d --env-file .env -p 3000:3000 --name auth-svc perforce/helix-auth-svc
```

The `.env` file referenced in the above command would look something like this:

```shell
SVC_BASE_URI=https://192.168.24.20:3000
PROTOCOL=https
DEFAULT_PROTOCOL=saml
SAML_IDP_METADATA_URL=https://dev-123456.okta.com/app/abc123xyz456/sso/saml/metadata
SAML_SP_ENTITY_ID=urn:example:sp
```

Note that the values in the file named by the `--env-file` option must **not** be quoted at all. See https://github.com/docker/cli/issues/3630 for more information on this topic.

### Docker Compose

If you prefer Docker Compose, then create a `docker-compose.yml` file that might
look something like this one:

```yaml
version: '3.7'
services:
  helix-auth-svc:
    image: perforce/helix-auth-svc:latest
    container_name: helix-auth-svc
    environment:
      SVC_BASE_URI: "https://192.168.24.20:3000"
      PROTOCOL: "https"
      DEFAULT_PROTOCOL: "saml"
      SAML_IDP_METADATA_URL: "https://dev-123456.okta.com/app/abc123xyz456/sso/saml/metadata"
      SAML_SP_ENTITY_ID: "urn:example:sp"
    ports:
      - "3000:3000"
```

You can then start the container using Docker Compose:

```shell
$ docker-compose up -d
```

## Configuration

The service is configured primarily by means of setting environment variables.
When starting the container, you can set environment variables using the `-e`,
`--env`, or `--env-file` options to the `docker` command, or more commonly, in
the `env` section of a Docker Compose file.

See the documentation for the complete list of available settings.

The docker container has several default environment variables defined that
may affect its usage:

```
ENV CA_CERT_FILE certs/ca.crt
ENV DEBUG "yes"
ENV NODE_ENV development
ENV PORT 3000
ENV PROTOCOL http
```

Note that the `PROTOCOL` is `http`, which will override any scheme present in
the `SVC_BASE_URI` setting. This works fine if the service is run from behind a
reverse proxy that is performing TLS termination, but if not, then it will be
necessary to set `PROTOCOL` to `https` as shown in the examples in the section
above.

### SSL certificates

The image contains a set of self-signed certificates which should be replaced
when deploying the service to production. To facilitate this, map the
replacement certificates via a volume (for instance, using the `-v` option to
`docker`, or the `volumes` setting in a Docker Compose file) and define the
certificate-related environment variables (`CA_CERT_PATH`, `IDP_CERT_FILE`,
`CERT_FILE`, and `KEY_FILE`) to reference those files.

### Swarm support

The service can be configured to act as a SAML 2.0 identity provider to other
services, including Perforce Swarm. This can be done by mapping a volume (for
instance, using the `-v` option to `docker`, or the `volumes` setting in a
Docker Compose file) that includes a configuration file, and setting the
`IDP_CONFIG_FILE` environment variable to reference that file. An example
configuration file can be found [here](https://github.com/perforce/helix-authentication-service/blob/master/routes/saml_idp.conf.cjs).

## How to get help

Configuring the authentication service, and the identity provider, is a
non-trivial task. Some expertise with security systems is helpful. In the event
that you need assistance with configuring these systems, please contact
[Perforce Support](https://www.perforce.com/support/request-support).

## License

View [license information](https://github.com/perforce/helix-authentication-service/blob/master/LICENSE.txt) for P4 Authentication Service.

As with all Docker images, this likely also contains other software which may be
under other licenses (such as Bash, etc from the base distribution, along with
any direct or indirect dependencies of the primary software being contained).
