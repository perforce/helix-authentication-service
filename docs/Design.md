# Design

This document is intended for developers who are interested in the inner workings of the P4 Authentication Service.

## Overview

The application consists of several related features, with each feature set broken into layers. The design follows that of Robert Martin's [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html). In particular, the directory structure resembles that described in a [tutorial](https://resocoder.com/2019/08/27/flutter-tdd-clean-architecture-course-1-explanation-project-structure/) series by Matt Rešetá, which is written using Dart and Flutter, and explains the practical application of the Clean Architecture and benefits of test-driven-development.

## Clean Architecture

In terms of features, the application has three: `admin` for the web-based administrative interface, `login` for authentication integration, and `scim` for user provisioning. All of the application related code is defined within the `lib/features/admin`, `lib/features/login`, and `lib/features/scim` directories. Everything outside of those directories is essentially scaffolding, primarily concerned with setting up the [Express.js](https://expressjs.com) web framework and logging. Within each of the `features` subdirectories, the code is divided into three layers.

### Presentation

The portion of the application which is visible to the outside world. This
includes the user-visible web pages as well as the OIDC/SAML protocol
implementations and the RESTful API for the SCIM-based user provisioning.

### Domain

The entities and use cases which define the "policy" of the application,
otherwise known as the business logic. Entities include the login requests,
Perforce users, and groups. The interface for several "repositories" is also
defined here, for storing the entities. Use cases include "starting a login",
"adding a user", and so on.

Why are there two entities in the `login` feature, one for the users and another
for requests? The client application (e.g. Helix Core), knows the user by some
identifier such as a username, while the authentication service uses uniquely
identified login requests to facilitate multiple logins by a single user. Once
the user entity has been created, its identifier is displayed in the application
log, which helps with debugging.

### Data

The "lowest" layer of the application, which interacts with those components
living outside of the application. This normally includes databases and remote
network-based services. For the `login` feature, there is a simple in-memory
store for the login requests, while the `scim` feature has a Helix repository
that interfaces with Helix Core Server. This layer also has implementations of
the entities called "models" that facilitate translation between the entities
and their external representation (e.g. JSON).

### Benefits

* Design is easier to discern simply by examining the directory structure
* Decouples domain layer from data and presentation, separating concerns
* Improves the thoroughness of unit testing

## Technical

### Dependency Injection

Going hand-in-hand with the application of the Clean Architecture is the use of
inversion of control, also known as dependency injection. This facilitates the
loose-coupling between the layers, especially between the domain and data
layers. This application uses [awilix](https://github.com/jeffijoe/awilix) which
is just sophisticated enough to satisfy every requirement, and does not require
the use of TypeScript, unlike many JavaScript DI modules. The registration of
the various "services" are defined in the `lib/container.js` module.

### Module Loading

Node.js offers little in terms of organizing modules in the application, so
any deeply nested directory structure can become a nuisance. One solution that
works well with ECMAScript Modules is to utilize the _package name_ of the
application in the `import` statement, like so:

```javascript
import usersRouter from 'helix-auth-svc/lib/features/scim/presentation/routes/users.js'
```

While the paths are a little long, they are easy to understand. This approach
works identically for the application code and the test code, avoiding the need
for "include" hacks when writing tests. Another approach would be to use
relative import paths, but that is arguably more difficult to reason about.

To facilitate this approach, the entire application is _exported_ in the
`exports` property of the `package.json` file, which should be fine for an
application, while a library would likely not use this method.

### Mock Objects

To facilitate thorough unit testing, the unit tests employ a JavaScript mocking
library named [sinon](https://sinonjs.org). Other choices included
[Jest](https://jestjs.io), however that particular tool is difficult to use
without closely following their particular expectations. What's more, Jest
cannot run the tests sequentially, which is crucial for the login tests.
