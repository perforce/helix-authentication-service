# Support External Data Store

* Status: accepted
* Deciders: Nathan Fiedler
* Date: 2020-10-28

## Context

This application handles several important pieces of information, including the
request/user mapping, and the session state for each browser connection. By
default this information is stored in memory within the application process.
However, if the application fails and another instance begins to process
requests (e.g. via a load balancer), then any login requests that are still in
progress will be lost (the user will get an error and have to try again).

To enable smooth failover and ensure high availability, an external data store
option should be provided, in which both the request/user mapping and the
session state will be stored. This store would be configured like any other
aspect of the application, via environment variables. If not so configured, the
existing in-memory data store should be used; this should be the default
behavior.

## Decision

Simply storing the data in a reliable fashion is easily done using disk files.
However, if the application is deployed to several machines, and one of those
machines goes down, then the disk files will be unavailable to the other
instance(s), assuming the use of local disk storage.

Alternatively, the data can be stored on a separate system, such as a database
or key/value store. A database is often more complex to set up than is really
necessary, and for the purpose of this application, a key/value store is more
than adequate. The question then becomes, which key/value store to use. Ideally
it would be popular, mature, and well maintained. It would also need an actively
maintained client library available as a Node package. The best solution would
be one with easy setup in cloud computing services such as Azure.

This application will offer support for the **Redis** key/value store. There are
several reasons for this choice:

1. Redis is popular, well supported, and has been maintained for more than 10 years.
1. Redis can be configured to use memory-only, or file-based storage.
1. Nearly all cloud computing providers offer readily-available Redis instances.

## Consequence

During development, the Docker-based Redis container has worked very well for
enabling failover of the application.

## Links

* Redis [website](https://redis.io) 
* node-redis [GitHub](https://github.com/NodeRedis/node-redis)
