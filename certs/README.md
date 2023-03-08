# Certificates

This directory contains several certificates used for development.

## Files

### `ca.crt` and `ca.key`

The public (`ca.crt`) and private (`ca.key`) key pair for the TLS certificate of
a fake certificate authority, used as the issuer to create signed certificates
for development.

### `server.crt` and `server.key`

The public (`server.crt`) and private (`server.key`) key pair for the TLS
certificate of the authentication service, signed using the fake issuer above.

### `server.p12`

A PKCS#12 certificate containing both the public and private keys defined in the
`server.crt` and `server.key` files. The private key is encrypted with the
passphrase `Passw0rd!` to facilitate testing the `PFX_FILE` and `KEY_PASSPHRASE`
authentication service settings.

### `encrypted.key`

An encrypted version of the `server.key` file, using the same passphrase as for
the `server.p12` file described above. This file is useful for testing the
`KEY_PASSPHRASE` setting with `KEY_FILE` setting.

## Generating the Certificates

For development purposes we create a self-signed certificate for the issuer and
use that to sign the client signing requests for the server extension and the
authentication service. The service uses this fake issuer to verify the server
extension client certificate, and likewise the extension can verify the service
certificate. The commands shown below create the three certificates (CA,
extension, and service) and produce differently formatted keys for testing.

```shell
$ cd certs
$ openssl req -sha256 -x509 -nodes -days 3650 -newkey rsa:4096 -keyout ca.key -out ca.crt -subj "/CN=FakeAuthority"
$ openssl req -sha256 -nodes -days 3650 -newkey rsa:4096 -keyout client.key -out client.csr -subj "/CN=LoginExtension"
$ openssl x509 -sha256 -req -in client.csr -CA ca.crt -CAkey ca.key -out client.crt -set_serial 01 -days 3650
#
# remove the client.csr
# move the client.crt and client.key to the login extension
#
$ openssl req -sha256 -nodes -days 3650 -newkey rsa:4096 -keyout server.key -out server.csr -subj "/CN=authen.doc"
$ openssl x509 -sha256 -req -in server.csr -CA ca.crt -CAkey ca.key -out server.crt -set_serial 01 -days 3650
#
# remove the server.csr
#
$ openssl pkcs12 -export -macalg sha256 -inkey server.key -in server.crt -out server.p12
#
# enter the passphrase mentioned above
#
$ openssl rsa -aes256 -in server.key -out encrypted.key
#
# enter the passphrase mentioned above
```
