# Design

This document is intended for developers who are interested in the inner
workings of the Helix Authentication Service.

## Overview

The application is largely made up of protocol handlers, and thus is not all
that interesting in terms of "design". However, to make the business logic
easier to discover and test effectively, the application design follows that of
Robert Martin's [Clean
Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html).
More specifically, the directory structure resembles that described in the
excellent
[tutorial](https://resocoder.com/2019/08/27/flutter-tdd-clean-architecture-course-1-explanation-project-structure/)
series by Matt Rešetá, which is written using Dart and Flutter, but explains the
practical application of the Clean Architecture and the benefits of
test-driven-development.

## Clean Architecture

In terms of "features", the application has only one, the "login" feature. All
of the application related code is defined within the `lib/features/login`
directory. Everything outside of that directory is essentially "scaffolding",
primarily concerned with setting up the [Express.js](https://expressjs.com) web
framework and logging. Within the `login` directory, the code is divided into
three layers.

### Presentation

The portion of the application which is visible to the outside world. This
includes the user-visible web pages as well as the OIDC/SAML protocol
implementations and the RESTful API.

### Domain

The entities and use cases which define the "policy" of the application,
otherwise known as the business logic. Entities include the login requests and
the user profiles. Use cases include "starting a request", "finding a user", and
"receiving a user profile".

Why are there two entities, one for the users and another for requests? The
client application (e.g. Helix Core), knows the user by some identifier such as
a username, while the authentication service uses uniquely identified login
requests to facilitate multiple logins by a single user. Once the user entity
has been created, its identifier is displayed in the application log, which
helps with debugging.

### Data

The "lowest" layer of the application, which interacts with those components
living outside of the application. This normally includes databases and remote
network-based services. For this relatively simple application, this consists of
the in-memory data store used to hold the login requests and user profiles
(albeit only temporarily). In a more complex application, this layer would have
implementations of the entities called "models" and those would be retrieved
from "data sources" such as a RESTful API or key/value store.

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

Node.js offers very little in terms of organizing modules in the application, so
any deeply nested directory structure quickly becomes a nuisance. For example,
from the [module-alias](https://github.com/ilearnio/module-alias) README file:

```javascript
require('../../../../some/very/deep/module')
```

To alleviate this pain, this application defines a global function named
`include()` that builds the correct path based on a relative location. As such
you will see linter directives to treat `include` as a global, and you will see
some `include()` calls in place of `require()`. This particular solution to the
problem is described as **The Wrapper** in a popular GitHub
[gist](https://gist.github.com/branneman/8048520) that offers several options
for dealing with this nuisance.

### Mock Objects

To facilitate thorough unit testing, the unit tests employ a JavaScript mocking
library named [sinon](https://sinonjs.org). Other choices included
[Jest](https://jestjs.io), however that particular tool is difficult to use
without closely following their particular expectations. What's more, Jest
cannot run the tests sequentially, which is crucial for the login tests.
