# Docker

## Deploying with Docker

A set of files for use with [Docker](http://docker.com) are provided with this
authentication service. The easiest way to get the service container running is
to edit the `docker-compose.yml` file and use `docker-compose` to build and run
the container.

```shell
$ docker-compose build svc.doc
$ docker-compose up -d svc.doc
```

The `svc.doc` name is a development convenience, and can be changed to a name
that is more suitable for your environment.

## Configuration

See the `Identity_Providers.md` file for an overview of how to configure the
service for various identity providers and protocols. In particular, you will
need to define either the OIDC or SAML settings, otherwise the service will not
know how to authenticate users.
