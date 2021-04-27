# HAS and Proxies

This document is intended for those who are interested in knowing more about the inner workings of the Helix Authentication Service.

## Overview

Placing a reverse proxy server between the client and HAS can serve several purposes, such as controlling traffic, modifying the shape of requests and responses, as well as balancing the load across multiple instances of the service.

## Configuring HAS

### Trusting the Proxy

In order for HAS to operate effectively when it is behind a reverse proxy, it is necessary to set the `TRUST_PROXY` environment variable. This value is then set in the `trust proxy` application setting, which is used by the Express.js framework to pick up the correct protocol (`http` or `https`). This in turn helps the `session-cookie` middleware correctly set the cookie as `secure` in responses. This is critical for the `SameSite=none` to have the desired effect during the login process -- see [Cookies.md](./Cookies.md) for more information on browser cookies and how they are used by HAS.

For values supported by the `TRUST_PROXY` setting, see [behind proxies](http://expressjs.com/en/guide/behind-proxies.html) on the Express.js web site. In addition to how `trust proxy` is used, the page also describes how the request headers are used by the framework to detect the connection protocol.

### Rule-based Routing

At a minimum, the proxy or load balancer should be configured to route requests
based on the session cookie set by the service. The cookie is named `JSESSIONID`
and its value will be unique, allowing the proxy to direct requests back to the
same service instance each time.

**Note:** When using Redis for storing session state, the proxy should _not_ be
routing requests based on session affinity. This allows for failover of the
service to be handled by the proxy without concern for user sessions. See the
[Failover.md](./Failover.md) document for information about service failover.

A service setting named `INSTANCE_ID` is available for supporting rule-based
routing in the proxy, prior to the session cookie being set. The value defined
in this setting will be appended to the login URL returned to the client as a
query parameter named `instanceId`. The proxy can then be configured to route
incoming requests using this query parameter value, but only if the query
parameter is present in the client request (it is difficult to configure an
identity provider to include an arbitrary query parameter in the callback URL,
for instance). In combination with the session affinity via the session cookie,
the query parameter will ensure that the user is always routed to the correct
instance of the service.

**Note:** As with session affinity, if Redis is being used for storing session
state, then the `INSTANCE_ID` setting is not necessary, as the information will
be available to all HAS instances.

## Timeouts

When using a reverse proxy, bear in mind that the proxy will likely have a set amount of time it will wait for a response from the backend server before it returns a 504 response to the client. If this timeout is shorter than the timeout in HAS itself, such as for the `/requests/status/:id` route, then the client will get an unexpected result (a 504 vs a 408).

## HAProxy

[HAProxy](http://www.haproxy.org) is a very popular web proxy that offers a very large number of settings and supports many use cases. A simple example is provided in the `haproxy.cfg` file in the `containers/haproxy` directory within HAS. The example demonstrates how to use HAProxy with HAS to facilitate several goals:

1. Terminate the SSL connection to offload that work from the HAS instance(s).
1. Use the HAS session cookie for session affinity with multiple HAS instances.
1. Set request headers that allow Express.js to detect the effective protocol.

## Amazon Load Balancers

The elastic/application load balancers offered by Amazon Web Services are akin to an extremely simplified version of HAProxy, and as such work well with HAS. All that is necessary is for HAS to be configured to trust the proxy, using the `TRUST_PROXY` setting.

For reference, the headers received by HAS when behind an `awselb/2.0` load balancer look like so:

```
accept: */*
host: aws-elb.helixalm.cloud
user-agent: curl/7.64.1
x-amzn-trace-id: Root=1-f1275f96-32cd0203e3f0e6cee09a3b1b
x-forwarded-for: 99.82.198.92
x-forwarded-port: 443
x-forwarded-proto: https
```

The `x-forwarded-proto` value is what informs the underlying Express.js framework that the protocol is secure, and hence the `session-cookie` middleware will allow setting secure cookies.

## Google Cloud Load Balancers

It is preferable to use standard ports for everything, otherwise you will need
to define firewall rules to help the connections go through. This is especially
true with load balancers and instance groups with previously defined ports.
Aside from that, setting `TRUST_PROXY` to `true`, `PROTOCOL` to `http`, and
`PORT` to `80` should be sufficient.

## References

* See the `cookie.secure` section in https://github.com/expressjs/session
