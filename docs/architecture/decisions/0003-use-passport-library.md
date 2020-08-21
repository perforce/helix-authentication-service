# Use Passport Library

* Status: accepted
* Deciders: Nathan Fiedler
* Date: 2020-08-20

## Context

This application is largely about supporting authentication protocols. To achieve a quick time to market, use of a third party library is desirable. Initially the application will support the OpenID Connect and SAML 2.0 authentication protocols, but it is quite possible that other protocols may be desired in the future.

## Decision

A (JavaScript) library that offers a plethora of authentication protocol implementations is named passport.js, licensed under a permissive license. While this library does not implement the particular protocols itself, it facilitates and integrates with Node.js in a way that makes it very easy for developers to use. There are currently over 400 Passport modules available, including OIDC and SAML.

As such, this application will leverage the Passport library and the OIDC and SAML modules.

## Consequence

The Passport library has been working splendidly, as have the OIDC and SAML modules.

## Links

* Passport.js [Home Page](http://www.passportjs.org)
* passport-saml [GitHub](https://github.com/node-saml/passport-saml)
* node-openid-client [GitHub](https://github.com/panva/node-openid-client)
