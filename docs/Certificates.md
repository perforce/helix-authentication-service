# Certificates

## Overview

SSL/TLS certificates are the basis for all secured connections with the
authentication service, whether it's making a SAML authentication request to an
identity provider, or simply serving content to a browser on the desktop. This
document outlines the ways in which certificates are used with the service.

## Authentication Service

The authentication service uses two files that together form the identity of the
service instance, namely the public certificate and its corresponding private
key. These files are named in the `.env` file as the `CERT_FILE` and `KEY_FILE`
settings, respectively. This keypair is used when browsers connect to the
service via HTTPS, as well as when encrypting and/or signing authentication
requests with an identity provider using SAML.

A third file, the public certificate for a certificate authority, named by the
`CA_CERT_FILE` setting, is used to validate the client that requests user data
from the service during the authentication process. An example of such a client
is the Helix Core Server `loginhook` extension. The client will connect to the
service over HTTPS and send its TLS _client_ certificate to retrieve the user
data. The service will then consult the `CA_CERT_FILE` to ensure the client is
trusted. The `CLIENT_CERT_CN` setting can be used to restrict client
certificates to those whose _Common Name_ matches the pattern given by
`CLIENT_CERT_CN`. In a similar way, the `CLIENT_CERT_FP` setting can be used to
compare with the SHA256 fingerprint of the client certificate.

Both the `CLIENT_CERT_CN` and `CLIENT_CERT_FP` values can have multiple entries, separated by commas and wrapped in square brackets (like so: `[value1, value2, ...]`).

## Other Applications

### Helix Core Extension

The `loginhook` extension comes with default TLS certificates that it uses to
connect to the authentication service, and in turn the service has a default
`CA_CERT_FILE` that correspondS to the client certificate from the extension.
Replacing the extension client certificate, or the `CA_CERT_FILE` of the
service, will require changing both sets of files.

### Helix Swarm

When Swarm is configured to connect to the authentication service via SAML, it
will validate the SAML response from the service by means of its `x509cert` TLS
certificate, as defined in the `config.php` file in Swarm. If the service
certificates are changed, then the Swarm `x509cert` will also need to be
changed. Simply copy and paste the contents of the file named by `CERT_FILE`
from the service into the `x509cert` setting in Swarm, with the `BEGIN` and
`END` lines and line breaks.

An alternative to using the `CERT_FILE` and `KEY_FILE` settings for the Swarm
integration is to set the `SAML_CERT_FILE` and `SAML_KEY_FILE` settings, which
may be used to reference a different public/private key pair specifically for
use with SAML. If these settings are provided, the service will use them when
signing and encrypting SAML authentication requests with the configured identity
provider, as well as for producing the SAML authentication response that is sent
to Swarm. Since these certs are separate from the certs used for HTTPS (namely
`CERT_FILE` and `KEY_FILE`), then it is possible to routinely rotate the certs
used for HTTPS while keeping the SAML-specific certs stable for a longer period
of time (since changing those involves changing the Swarm configuration).

## Validating Certificates

### Verifying certificate was signed by authority

The client certificate used to connect to the authentication service must be validating using the configured certificate authority (the `CA_CERT_FILE` or `CA_CERT_PATH` settings). To ensure that a client certificate can be validated using the expected CA certificate, use the `openssl` command as shown below:

```shell
$ openssl verify -CAfile ca.crt client.crt
client.crt: OK
```

The example shows that this client certificate is `OK` when validated using the `ca.crt` certificate. The next example shows what the output might look like when a certificate _cannot_ be validated.

```shell
$ openssl verify -CAfile ca.crt client.crt
CN = authen.doc
error 20 at 0 depth lookup:unable to get local issuer certificate
client.crt: verification failed: 20 (unable to get local issuer certificate)
```

### Verifying the purpose of a certificate

A certificate has one or more assigned purposes, such as acting as a certificate authority, or for acting as a client when connecting to a server, and so on. To ensure that a certificate has the purpose for which it was intended, use the `openssl` command as shown below:

```shell
$ openssl x509 -in client.crt -noout -purpose
Certificate purposes:
SSL client : Yes
SSL client CA : No
SSL server : Yes
SSL server CA : No
...
```

This example shows that the `client.crt` certificate is able to be used on either the client (`SSL client : Yes`) or server side (`SSL server : Yes`) of a connection.

### Matching public certificate with private key

To verify that a public certificate and a private key match each other, use the
`openssl` command as shown below. From the example, the output shows that the
two files have the same SHA1 modulus values, meaning that they match.

```shell
$ openssl x509 -in server.crt -noout -modulus | openssl sha1
(stdin)= 6fe6dfb87b116a75672f051f708c7bcd62a17416
$ openssl rsa -in server.key -noout -modulus | openssl sha1
(stdin)= 6fe6dfb87b116a75672f051f708c7bcd62a17416
```

## References

* https://www.digicert.com/how-tls-ssl-certificates-work
* https://letsencrypt.org
