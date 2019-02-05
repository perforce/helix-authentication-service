# OIDC Service

This [Node.js](https://nodejs.org/en/) based application implements a simple
OpenID Connect service provider.

## Getting Started

### Prerequisites

You will need to install [Node](http://nodejs.org) *LTS*, the *Current* version
may have compatibility issues with some modules, and in general can be a bit
unstable.

### Steps

Install the dependencies:

```
$ npm install
```

Run the application (in development mode):

```
$ npm start
```

## Why Node and Passport?

### Node.js

Applications running on Node are sufficiently fast, especially compared to
Python or Ruby. There are multiple OIDC and SAML libraries for Node to choose
from.

### Passport

The [passport](http://www.passportjs.org)
[SAML](https://github.com/bergie/passport-saml) library works and is easy to
use.

## Coding Conventions

With respect to the JavaScript code, the formatting follows
[StandardJS](https://standardjs.com). The
[linter](https://atom.io/packages/linter-js-standard) available in
[Atom](https://atom.io) is very good, and catches many common coding mistakes.
Likewise with [Visual Studio Code](https://code.visualstudio.com) and the
[StandardJS](https://github.com/standard/vscode-standardjs) extension.
