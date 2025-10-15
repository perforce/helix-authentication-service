# Testing P4AS with nginx

## nginx as a reverse proxy

The [Docker](https://www.docker.com) containers defined in `docker-compose.yml`
provide an example of running multiple instances of P4AS behind nginx, which is
configured as a reverse proxy with load balancing.

It is important to note that nginx has been configured to set certain headers so
that the session middleware used by P4AS can recognize that it is running behind
a secure proxy, and thereby set a secure cookie. Without this, user login will
fail with certain web browsers.

## Testing

The docker containers have names that end with `.doc` to enable the use of
dnsmasq for resolving the names of the containers. See the `README.md` file in
the `containers` directory for details.

Start by building the containers:

```shell
$ docker compose up --build -d
```

Then use `curl` to check that the service is responding correctly:

```shell
$ curl -k https://authen.doc/requests/new/foobar
{"request":"01F4HYEDCH7BHFJXN9T20T5218","loginUrl":"https://authen.doc/saml/login/01F4HYEDCH7BHFJXN9T20T5218?instanceId=none","baseUrl":"https://authen.doc","instanceId":"none"}

$ curl -k -D - https://authen.doc/saml/login/01F4HYEDCH7BHFJXN9T20T5218
HTTP/1.1 302 Found
Server: nginx/1.20.0
Date: Fri, 30 Apr 2021 17:50:39 GMT
Content-Length: 0
Connection: keep-alive
[...snip...]
Set-Cookie: JSESSIONID=s%3AhL-8esnTCA3HHtw8nq-oSVltFb8bNLHr.LaHvz9YGYBr2%2FWKVKTYTrRs2402QtpVTtM5jgQvgnx8; Path=/; Expires=Fri, 30 Apr 2021 18:50:39 GMT; HttpOnly; Secure; SameSite=None
```

The response shows that the cookie was set in a secure manner, as indicated by
the `Secure` keyword in the value for the `Set-Cookie` header.

Note that the SAML configuration is not usable as-is, and would need to be
changed in order to test the full path through the login process.
