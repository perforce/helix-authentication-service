# Use ECMAScript Modules

* Status: accepted
* Deciders: Nathan Fiedler
* Date: 2021-10-22

## Context

Since 2015 JavaScript has had a standard for defining and importing modules, as defined in chapter 15 of the [ECMAScript 2015 Language Specification](https://262.ecma-international.org/6.0/) (also known as ECMAScript 6). [Node.js](https://nodejs.org/) introduced support for ECMAScript Modules (ESM) in late 2020, with all major supported versions providing ESM support.

Prior to the use of ECMAScript Modules, this application was using the `require()` functionality provided by Node.js to import modules. While this worked without any issue, the dawn of a major problem appeared on the horizon: third party libraries started using ESM. The old `require()` module system cannot import modules defined using the new ECMAScript 6 syntax. While ESM is backward compatible, it is not forward compatible. As more libraries migrate to this standard, the application will gradually go stale, using old versions of libraries.

As such, switching the entire application to ESM has become a necessity.

## Decision

This application will use ECMAScript Modules because it is the only sensible choice going forward.

## Consequence

Using `import` instead of `require()` brought about several other changes, including the need to remove the `include` hack that was used to deal with long import paths. In a similar vein, the use of `dotenv` had to be managed by the use of `import` of a new `env.js` module. The format of the shallow "modules" for configuring logging and the internal SAML IdP functionality required a minor change to use the ESM syntax.

Of more signifcance is that the single binary build produced by the `pkg` tool may be unavailable, at least temporarily, as it seems that `pkg` has several issues with ESM.

## Links

* [ECMAScript 2015 Language Specification](https://262.ecma-international.org/6.0/) -- when modules were introduced
* [ECMAScript Modules specification](https://tc39.es/ecma262/#sec-modules) -- latest specification
* [Mozilla guide on modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
