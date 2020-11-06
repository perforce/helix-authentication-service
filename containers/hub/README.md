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

To learn about the architecture, supported products and identity providers, as
well as the configuration steps for the current version, see the [Helix
Authentication Service Administrator
Guide](https://www.perforce.com/manuals/helix-auth-svc/).

## Configuration

The service is configured primarily by means of setting environment variables.
When starting the container, you can set environment variables using the `-e`,
`--env`, or `--env-file` options to the `docker` command, or more commonly, in
the `env` section of a Docker Compose file.

See the documentation for the complete list of available settings.

### SSL Certificates

The image contains a set of self-signed certificates which should be replaced
when deploying the service to production. To facilitate this, map the
replacement certificates via a volume (for instance, using the `-v` option to
`docker`, or the `volumes` setting in a Docker Compose file) and define the
certificate-related environment variables (`CA_CERT_PATH`, `IDP_CERT_FILE`,
`SP_CERT_FILE`, and `SP_KEY_FILE`) to reference those files.

### Swarm Support

The service can be configured to act as a SAML 2.0 identity provider to other
services, including Perforce Swarm. This can be done by mapping a volume (for
instance, using the `-v` option to `docker`, or the `volumes` setting in a
Docker Compose file) that includes a configuration file, and setting the
`IDP_CONFIG_FILE` environment variable to reference that file. An example
configuration file can be found [here](https://github.com/perforce/helix-authentication-service/blob/master/routes/saml_idp.conf.js).

## How to Get Help

Configuring the authentication service, and the identity provider, is a
non-trivial task. Some expertise with security systems is helpful. In the event
that you need assistance with configuring these systems, please contact
[Perforce Support](https://www.perforce.com/support/request-support).

## License

View [license information](https://github.com/perforce/helix-authentication-service/blob/master/LICENSE.txt) for Helix Authentication Service.

As with all Docker images, this likely also contains other software which may be
under other licenses (such as Bash, etc from the base distribution, along with
any direct or indirect dependencies of the primary software being contained).
