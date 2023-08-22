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

## Implementation Details

### Forms and Material UI

The input validation library, `react-hook-form`, prominently demonstrates the
use of a function named `register()` that is invoked for each form input field.
However, when used with CSS frameworks like Material UI (MUI), the result may be
undesirable visual artifacts. Namely, when using the `OutlinedInput` for a text
field, the placeholder text would be drawn over the field value, rather than
appearing as the form label. To correct this behavior, the forms all make use of
the `Controller` type from `react-hook-form`, and as such, the code looks quite
different from the examples on the
[react-hook-form.com](https://react-hook-form.com) web site.

As a side note, any `Tooltip` that is associated with an input field must be
wrapped in the `render()` function of the `Controller` rather than being
outside. This avoids warnings in the console about the manner in which the `ref`
is passed to children.
