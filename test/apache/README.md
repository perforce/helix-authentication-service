# Testing HAS with Apache

## Apache as a reverse proxy

The [Docker](https://www.docker.com) containers defined in `docker-compose.yml`
provide an example of running multiple instances of HAS behind Apache, which is
configured as a reverse proxy with load balancing.

It is important to note that Apache has been configured to set certain headers so
that the session middleware used by HAS can recognize that it is running behind
a secure proxy, and thereby set a secure cookie. Without this, user login will
fail with certain web browsers.

## Testing

The docker containers have names that end with `.doc` to enable the use of
dnsmasq for resolving the names of the containers. See the `README.md` file in
the `containers` directory for details.

Start by building the containers:

```shell
$ docker-compose up --build -d
```

Then use `curl` to check that the service is responding correctly:

```shell
$ curl -k https://authen.doc/requests/new/foobar
{"request":"01F4HYEDCH7BHFJXN9T20T5218","loginUrl":"https://authen.doc/saml/login/01F4HYEDCH7BHFJXN9T20T5218?instanceId=none","baseUrl":"https://authen.doc","instanceId":"none"}

$ curl -k -D - https://authen.doc/saml/login/01F4HYEDCH7BHFJXN9T20T5218
HTTP/1.1 302 Found
Date: Tue, 19 Oct 2021 00:24:14 GMT
Server: Apache/2.4.51 (Unix) OpenSSL/1.1.1d
[...snip...]
Set-Cookie: JSESSIONID=s%3Aiw5097-jC9G49dpc2fs-56CembxxA8H9.gvH1laxVnwJmpMaqHcZMufqg56CXgBBPKSYKV5W1azc; Path=/; Expires=Tue, 19 Oct 2021 01:24:14 GMT; HttpOnly; Secure; SameSite=None
```

The response shows that the cookie was set in a secure manner, as indicated by
the `Secure` keyword in the value for the `Set-Cookie` header.

Note that the SAML configuration is not usable as-is, and would need to be
changed in order to test the full path through the login process.
