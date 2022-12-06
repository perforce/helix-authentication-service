# Architecture

This document is intended for developers who are interested in the inner
workings of the Helix Authentication Service.

## Overview

The authentication service is a basic [Node.js](https://nodejs.org/en/) application that utilizes the [Express](http://expressjs.com) web framework to serve static HTML pages and support a REST API.

## REST API

See the [REST_API.md](./REST_API.md) document for details on the API related to authentication integration and the web-based administrative interface.

With regards to supporting user provisioning via the [SCIM](http://www.simplecloud.info) standard, see the relevant specifications:

* https://tools.ietf.org/html/rfc7642
* https://tools.ietf.org/html/rfc7643
* https://tools.ietf.org/html/rfc7644

## Helix Core Server integration

If the authentication service is configured to support user provisioning to Helix Core Server, then the service will expect to find a `p4` binary installed locally in order to connect to the remote server instance.

## External Storage

Any external storage is optional and configured by the customer. The only supported external storage system at this time is [Redis](https://redis.io) for caching session data in order to facilitate failover. See the [Failover.md](./Failover.md) document for details.

## Administrative Inteface

The web-based administrative interface is an opt-in feature that allows a customer to modify the service configuration from a web browser. The client application, by default a React-based web app, will send admin credentials to the REST API in order to acquire a JSON Web Token, which is then used to authenticate requests to retrieve and modify the service configuration. See the [REST_API.md](./REST_API.md) document for details on the protocol.

## Internal Design

See the [Design.md](./Design.md) document for a discussion of the internal workings of the application.
