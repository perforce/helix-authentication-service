[![Support](https://img.shields.io/badge/Support-Official-green.svg)](mailto:support@perforce.com)

# Helix Authentication Service

This [Node.js](http://nodejs.org) based application implements a simple
authentication protocol integration service that may be used in concert with
systems wanting to permit users to authenticate with external identity systems.
It currently supports the OpenID Connect and SAML 2.0 authentication protocols.

## Versions

Official releases will have version numbers of the form `YYYY.N`, such as
`2019.1`, `2020.1`, or `2020.2`. These releases have undergone testing and are
available on the Perforce FTP and package server.

Patch releases will have version numbers with three dot separated numbers, such
as `2020.1.1` or `2019.1.2`.

The unofficial "snapshot" releases will have versions with additional numbers,
`YYYY.N.N.NNNNNN`, where the patch and snapshot numbers are appended to the last
major release. These may include changes that are not yet reflected in the
documentation, and these versions are limited to Community Support.

## Documentation

To learn about the architecture, supported products and identity providers, as well as the  configuration steps for the current version, see the [Helix Authentication Service Administrator Guide](https://www.perforce.com/manuals/helix-auth-svc/). Older versions of the guide are in the [docs](./docs) directory.

## How to Get Help

Configuring the extension, the authentication service, and the identity provider
is a non-trivial task. Some expertise with security systems is helpful. In the
event that you need assistance with configuring these systems, please contact
[Perforce Support](https://www.perforce.com/support/request-support).

## Development

See the [development](./docs/Development.md) page for additional information
regarding building and testing the service. For a description of the overall
design of the application, see the [Design.md](./docs/Design.md) page.
