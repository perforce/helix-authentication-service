# Provide a RESTful API

* Status: accepted
* Deciders: Nathan Fiedler
* Date: 2020-08-20

## Context

The authentication service serves multiple products, none of which is quite like the other. As such, the interface for the service should be as easy as possible to use from anywhere. In short that means accessing it over the network, as the client application will likely live on a different system. What's more, the protocol should be one so common that every system can support it.

As you may have guessed that would be HTTP/S. It is easy to understand, debug, is supported by basically everything, and trivial to implement (via readily available libraries). Alternatives could include GraphQL, which is fancy, but adds complexity that is unnecessary for this simple application, and a hand-written protocol, but that only creates more work for the client with no benefit.

## Decision

Use **HTTP** as that is quite obvious.

## Consequences

The service has used HTTP as it's primary client interface since the beginning and that has worked out very well. It can be tested easily, debugged using commonly available tools such as `curl`, and it is familiar to many system administrators.

## Links

* Representational state transfer [Wikipedia](https://en.wikipedia.org/wiki/Representational_state_transfer)
