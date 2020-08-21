# Use (only) Memory Store

* Status: accepted
* Deciders: Nathan Fiedler
* Date: 2020-08-20

## Context

This application handles several important pieces of information. First is mapping requests for a login to a particular login action, and second is the login results to the initial request. This allows for the client application to signal that a login will begin, get the login URL that should be used, and then query the results of that login action.

For the sake of reliability, this information could be written to a database on a storage device. However, that adds complexity to the deployment of the application, and most of this data is ephemeral at best, lasting only a few seconds and up to a few minutes. Alternatively, the application could simply use an in-memory data store, which avoids leaking data in the event of a system breach, at the expense of losing data if the application is restarted.

## Decision

This application will use an **in-memory** store rather than files or a database. The particular Node.js module selected is named `memorystore` and supports time-to-live expiration of cached data, which limits the time and exposure of any sensitive user data.

## Consequence

The application has been using an in-memory store since the beginning, with no issues.

## Links

* memorystore [GitHub](https://github.com/roccomuso/memorystore)
