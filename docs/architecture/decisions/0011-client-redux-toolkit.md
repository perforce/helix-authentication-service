# Redux Toolkit

* Status: accepted
* Deciders: Nathan Fiedler
* Date: 2022-12-05

## Context

Web applications of basically any complexity at all will involve managing some
form of state. This can done with just plain objects, and JQuery is a good
example of where this can go horribly awry. As the application grows in size and
complexity, managing the state becomes a major undertaking. Managing even just a
single bearer token, across several nested components is difficult without some
form of comprehensive state management.

Using the bearer token as an example, with React hooks and nested components,
the token expiration is difficult to manage without angering React. Attempting
to circumvent this by having a subcomponent call directly into the hook of a
parent is forbidden in React, probably for good reason.

For these and other reasons, **many** state management libraries have been
created over the years to help with accessing and updating a frequently changing
global state. A popular library is [Redux](https://redux.js.org) which has since
been expanded to provide support for asynchronous request processing via the
[Redux Toolkit](https://redux-toolkit.js.org) library. With RTK, not only is the
management of the state centralized and testable, but the client/server nature
of the application is streamlined and also testable. This testability comes from
the separate of the interface components and the underlying business logic,
which is facilitated by Redux and Redux Toolkit.

## Decision

Use Redux Toolkit to manage state and interact with the backend.

## Consequence

None as yet.

## References

* https://redux-toolkit.js.org
