# Certificates

This directory contains several self-signed certificates used for development.

## Files

### `ca.crt` and `ca.key`

The public (`ca.crt`) and private (`ca.key`) key pair for the TLS certificate of
a fake certificate authority, used to created signed certificates for testing.

### `server.crt` and `server.key`

The public (`server.crt`) and private (`server.key`) key pair for the TLS
certificate of a self-signed certificate for the authentication service. Created
using the fake CA whose key pair is `ca.crt` and `ca.key`.

### `server.p12`

A PKCS#12 certificate containing both the public and private keys defined in the
`server.crt` and `server.key` files. The private key is encrypted with the
passphrase `Passw0rd!` to facilitate testing the `PFX_FILE` and `KEY_PASSPHRASE`
authentication service settings.

## Generating the Certificates

For development we create a self-signed certificate for the authentication
service and use that to sign the client signing request for the server
extension, thus creating the client certificate for the extension. This works
fine for the client since our service will accept its own certificate as a
certificate authority. However, we cannot use this same trick with the service
since the browsers will not accept our fake certificate authority. For now, we
only sign the client certificate and leave the service certificate as
self-signed, since most browsers will tolerate that.

```shell
$ cd certs
$ openssl req -x509 -nodes -days 3650 -newkey rsa:4096 -keyout ca.key -out ca.crt -subj "/CN=FakeAuthority"
$ openssl req -nodes -days 3650 -newkey rsa:4096 -keyout client.key -out client.csr -subj "/CN=LoginExtension"
$ openssl x509 -req -in client.csr -CA ca.crt -CAkey ca.key -out client.crt -set_serial 01 -days 3650
# remove the client.csr
# move the client.crt and client.key to the login extension
$ openssl req -x509 -nodes -days 3650 -newkey rsa:4096 -keyout server.key -out server.crt -subj "/CN=AuthService"
$ openssl pkcs12 -export -inkey server.key -in server.crt -out server.p12
# enter the passphrase mentioned above
```
