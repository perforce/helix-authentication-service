# HAS Admin Client

## Overview

The administrative client is a React-based web client built using [Vite](https://vitejs.dev) and as such everything you need to know can be found on the Vite web site.

## Starting

```shell
npx vite
```

Note that the authentication service needs to be running on port `3000` and configured to support the administrative interface (the `ADMIN_ENABLED`, `ADMIN_USERNAME`, and `ADMIN_PASSWD_FILE` environment variables are all defined when starting the service). It is also assumed that the service is using HTTPS for all connections, and as such the `SVC_BASE_URI` must start with `https://` to activate HTTPS. Without HTTPS, testing logins will likely fail, so Vite has been configured to allow for insecure connections to the backend. See the `vite.config.js` for details.

## Building

Building the client application for production is as easy as running the following command:

```shell
npx vite build
```

Building for the purpose of building the authentication service deliverable, however, we use the following options:

```shell
npx vite build --outDir ../public/admin --emptyOutDir
```
