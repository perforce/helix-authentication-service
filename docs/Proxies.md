# Proxies

## Overview

Placing a reverse proxy or load balancer between the client and the authentication service can serve several purposes, such as controlling traffic, modifying the shape of requests and responses, as well as facilitating high availability via multiple instances of the service.

There are two basic methods for directing traffic to multiple service instances. One is to configure rule-based routing within the reverse proxy, while the alternative is to let the proxy send requests to any available instance. The former is suitable if the uptime of a service instance is good enough and you do not want to install and configure additional software. For high availability, however, the better solution is to set up an instance of a [Redis](https://redis.io) server that will be used to store the session data that facilitates the authentication process. With Redis in place, incoming requests can be directed to any available instance of the service.

## Configuring HAS

### Common Settings

An example of the settings commonly used when the auth service is sitting behind a proxy is shown below:

```
SVC_BASE_URI=https://addr-of-alb.example.com
PROTOCOL=http
PORT=3000
TRUST_PROXY=true
```

For further explanation of these settings, see the sections below.

### TLS Termination

In the example above, the `SVC_BASE_URI` setting starts with `https` while the `PROTOCOL` setting is `http` -- this tells the service that it will be listening for HTTP connections while a proxy will be handling the HTTPS connection with the client. This is commonly referred to as TLS termination, which offloads the work of the TLS connection to the proxy and leaves the auth service to focus on authentication.

One tradeoff of using http is that the service will no longer validate the client certificate sent by the client applications (such as the login extension in Helix Core Server) since the certificate is not delivered to the service over HTTP. If this is a concern, then remove the `PROTOCOL` setting and the service will manage the HTTPS connection directly (and validate the client certs).

### Port Number

Since the proxy is handling the client connections, the service itself is free to use any port value, and this can be set using the `PORT` setting. As with the `PROTOCOL`, this overrides the explicit or implicit port value in the `SVC_BASE_URI` setting.

### Trusting the Proxy

In order for the service to operate effectively when it is behind a reverse proxy, it is necessary to set the `TRUST_PROXY` environment variable. This value is then set in the `trust proxy` application setting, which is used by the Express.js framework to pick up the correct protocol (`http` or `https`). This in turn helps the `session-cookie` middleware correctly set the cookie as `secure` in responses. This is critical for the `SameSite=none` to have the desired effect during the login process -- see [Cookies.md](./Cookies.md) for more information on browser cookies and how they are used by the service.

For values supported by the `TRUST_PROXY` setting, see [behind proxies](http://expressjs.com/en/guide/behind-proxies.html) on the Express.js web site. In addition to how `trust proxy` is used, the page also describes how the request headers are used by the framework to detect the connection protocol.

## Routing Options

### Rule-based Routing

If using rule-based routing, a combination of browser cookies and proxy rules to match query parameters in the URL will be utilized. With regards to the browser cookie, the reverse proxy should be configured to route requests based on the session cookie set by the service. The cookie is named `JSESSIONID` and its value will be unique, allowing the proxy to direct requests back to the same service instance each time. This is necessary since not all URLs to the service will have a distinctive query parameter on which to route the requests (for instance, the callback from the identity provider).

For the rule-based component of the routing solution, the service setting named `INSTANCE_ID` is available to assign a unique identity to each service instance. The value defined in this setting will be appended to the login URL returned to the client as a query parameter named `instanceId`. The proxy can then be configured to route incoming requests using this query parameter value, but only if the query parameter is present in the client request (it is difficult to configure an identity provider to include an arbitrary query parameter in the callback URL). In combination with the session affinity via the session cookie, the query parameter will ensure that the user is routed to the correct instance of the service.

### Using Redis

The alternative routing solution is to allow the proxy to direct traffic to any available service instance, while relying on [Redis](https://redis.io) to hold the session data. This offers seamless failover such that any pending login requests will still complete as long as at least one service instance is still running.

Support for Redis is enabled in the authentication service by setting the `REDIS_URL` environment variable (typically by modifying the `.env` file). This value is used to identify a system on which Redis is installed and running and is reachable from the authentication service. Installing and configuring Redis is documented at [redis.io](https://redis.io) -- typically just installing the package on a Linux system will suffice. A simple example of a Redis URL could look like this:

```
REDIS_URL=redis://192.168.1.1:6389'
```

See the [Configuring Helix Authentication Service](https://www.perforce.com/manuals/helix-auth-svc/Content/HAS/configuring-has.html) chapter of the admin guide for more information on the `REDIS_URL` setting, as well as `REDIS_CERT_FILE` and `REDIS_KEY_FILE` settings for enabling a TLS connection to Redis.

Additionally, if the Redis server is configured to expect a username and password, those can be provided in the `REDIS_URL` value:

```
REDIS_URL=redis://username:authpassword@192.168.1.1:6389
```

**Note:** When using Redis for storing session state, the proxy should _not_ be routing requests based on session affinity. This allows for failover of the service to be handled by the proxy without concern for user sessions.

## Timeouts

When using a reverse proxy, bear in mind that the proxy will likely have a set amount of time it will wait for a response from the backend server before it returns a 504 response to the client. If this timeout is shorter than the `LOGIN_TIMEOUT` setting in the authentication service (default is `60` seconds), then the client will get an unexpected result (a 504 vs a 408). If this proves to be an issue, try to adjust the timeout of the proxy to allow more time for the login to complete.

## Reverse Proxies

### HAProxy

[HAProxy](http://www.haproxy.org) is a very popular web proxy that offers a very large number of settings and supports many use cases. A simple example is provided in the `haproxy.cfg` file in the `containers/haproxy` directory. The example demonstrates how to use HAProxy with the service to facilitate several goals:

1. Terminate the TLS connection to offload that work from the service.
1. Use the session cookie for session affinity with multiple instances.
1. Set request headers that allow Express.js to detect the effective protocol.
1. Pass the client TLS certificate to the backend using a specific HTTP header.
1. Enforce rate limits on requests to specific API endpoints on the backend.

By default, HAProxy limits request sizes to `16,384` bytes which protects the backend server from abuse by clients that send large amounts of data. See the `tune.bufsize` setting in the documentation for details and caveats with regards to changing the value.

### NGINX

[NGINX](https://www.nginx.com) can be configured to act as a reverse proxy, load balancing requests across multiple instances of the service. See the example Docker containers and configuration in the `test/nginx` directory.

### Apache

[Apache](https://httpd.apache.org), while rather heavyweight for this purpose, can be configured to act as a reverse proxy. See the example Docker containers and configuration in the `test/apache` directory.

### Amazon Load Balancers

The elastic/application load balancers offered by Amazon Web Services are akin to an extremely simplified version of HAProxy, and as such work well with the service. All that is necessary is for the service to be configured to trust the proxy, using the `TRUST_PROXY` setting.

### Google Cloud Load Balancers

It is preferable to use standard ports for everything, otherwise you will need
to define firewall rules to help the connections go through. This is especially
true with load balancers and instance groups with previously defined ports.
Aside from that, setting `TRUST_PROXY` to `true`, `PROTOCOL` to `http`, and
`PORT` to `80` should be sufficient.

## References

* See the `cookie.secure` section in https://github.com/expressjs/session
