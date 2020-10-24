# HAS and Cookies

This document is intended for those who are interested in knowing more about the inner workings of the Helix Authentication Service.

## Overview

The process of authenticating via the service involves connecting a series of requests that begins at the "login" page of the service, and returns when the identity provider directs the browser back to the service. Connecting these requests is done using a browser "session" cookie. This worked well until changes were made in some popular web browsers, which caused the login process to fail mysteriously. This document will give details on those changes and how HAS was modified to accommodate them.

## SameSite Cookies

In November of 2019, a [proposal](https://tools.ietf.org/html/draft-west-cookie-incrementalism-00) was put forward by developers at Google to improve the security of browser cookies. As a result, the enforcement of cookies with the `SameSite` value has changed in some web browsers, and for sites that do not indicate a `SameSite` policy, a new default (`lax`) will be applied. This change affects how browsers interact with HAS during the login process. In particular, both the `lax` and `strict` values for `SameSite` mean that cookies set by HAS will not be returned to HAS via an HTTP `POST` request originating from another site. This is precisely how the login result from an identity provider is returned to HAS, and if the cookie is not returned in this request, HAS will have no means of connecting the result with the user that started the login process. This scenario is described in the section titled **"Unsafe" requests across sites** on the [SameSite cookie recipes](https://web.dev/samesite-cookie-recipes/) page, which is helpful for understanding how `SameSite` cookies can be used effectively.

The solution for HAS is to indicate that the cookie has a `SameSite` value of `none`, and also set the cookie as `secure` so that the browser will return the cookie in the `POST` requests originating from the identity provider. With the `secure` flag, the client will only send the cookie if the connection to HAS is over HTTPS. Therefore, HAS must be using an HTTPS connection, either directly or via a proxy.

### Affected Browsers

The change in the `SameSite` policy has been implemented in Google Chrome since version 84, and in the Microsoft Edge browser, which is based on the Chromium engine on which Chrome is built. Over time it is expected to appear in other browsers as well.

## Proxies

The requirement for HAS to be accessible via HTTPS will affect any proxy placed between HAS and the web client. For more information on the topic of proxies, see the [Proxies.md](./Proxies.md) document.

## References

* https://web.dev/samesite-cookies-explained/
* https://web.dev/samesite-cookie-recipes/
