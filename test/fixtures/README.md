# Test Fixtures

## Expired Certificates

Creating the expired certificates involves using a utility called `faketime` that will run another program with a false system time. Start by installing the appropriate package.

```shell
sudo apt install faketime
```

Then invoke `faketime` with a value that is appropriately old. In the examples below, the certificate is made to expire in 6 days, which means we must have the system time appear to be just a bit earlier than that. The current time was a Tuesday afternoon, so instruct `faketime` to report the day before as the current time instead.

```shell
faketime 'last monday 11 am' /bin/bash -c 'openssl req -sha256 -x509 -nodes -days 6 -newkey rsa:4096 -keyout expired_ca.key -out expired_ca.crt -subj "/CN=ExpiredAuthority"'

faketime 'last monday 11 am' /bin/bash -c 'openssl req -sha256 -nodes -days 6 -newkey rsa:4096 -keyout expired_server.key -out expired_server.csr -subj "/CN=expired.doc"'

faketime 'last monday 11 am' /bin/bash -c 'openssl x509 -sha256 -req -in expired_server.csr -CA expired_ca.crt -CAkey expired_ca.key -out expired_server.crt -set_serial 01 -days 6'

openssl pkcs12 -export -macalg sha256 -inkey expired_server.key -in expired_server.crt -out expired_server.p12
```

Note that we must specify `sha256` in a few places as it seems that `openssl` will not do so by default when generating certificates, but then treats certificates using SHA1 as an error.
