# Use JSON Web Tokens

* Status: accepted
* Deciders: Nathan Fiedler
* Date: 2022-12-05

## Context

The web-based administrative interface requires some form of authentication to
prevent unauthorized access. Typically, a web form will present the user with a
username and password field, which is then used to establish a secure session
with the backend. Some form of session key is then passed from the client to the
backend with each request, asserting the authorization of the client to make
changes on the backend. This key can then be expired or invalidated by a user
action, such as explicit logout. The form that this session key takes can be
anything really, often times just a random value generated each time the user
authenicates with the backend.

An alternative to an opaque random session key is to use a value with a
well-defined format and meaning, such as a JSON Web Token (JWT). The advantage
of a JWT is that they can used by stateless applications since all of the
pertinent information is in the token itself. Assuming that the token is proved
to be valid via signature validation, it is no less secure than any other value.
All of the vulnerabilities related to web tokens is due to poor enforcement by
the backend services, not the token format or algorithms. While the stateless
feature is of no consequence for this application, it allows for change in its
usage in the future.

## Decision

The client will send credentials to backend and receive a JSON Web Token, which
is then passed back to the service with each subsequent request.

## Consequence

None as it would be trivial to change this at any time. It just so happens that
JWT is convenient and there are libraries for generating and validating them.
