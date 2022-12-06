# Web-based Administrative Interface

This document is intended for developers who are interested in learning how to
modify and test the Helix Authentication Service.

## Setup

Setting up the web-based administrative interface involves configuring and
running the client "server" as well as the authenication service itself, with
certain settings configured.

### Backend Setup

The administrative interface is disabled by default and must be enabled via
configuration. This cannot be changed from the interface itself and requires
editing the `.env` file in the service base directory.

```
ADMIN_ENABLED=true
ADMIN_PASSWD_FILE=secrets/passwd.txt
ADMIN_USERNAME=admin
SVC_BASE_URI=https://localhost:3000
```

The file named by `ADMIN_PASSWD_FILE` can be any file, the `secrets/passwd.txt`
value is just one example. The file should contain the unecrypted password of
the administrative user, named by the `ADMIN_USERNAME` setting. The value for
the `ADMIN_USERNAME` can be any value of your choosing, with `admin` being one
example. Regarding `SVC_BASE_URI`, the client server will proxy API requests to
port 3000, as configured in the `client/package.json` file, hence the service
must be listening on that port.

Start the service in the usual way:

```shell
npm start
```

### Client Setup

In the `client` directory, create a file named `.env` with contents like that
shown below. The `PORT` is to assign the client server a port that does not
conflict with the service, and `HTTPS` will enable HTTPS support, which allows
for testing OIDC and SAML with most browsers.

```
PORT=9000
HTTPS=true
```

Start the client server from the `client` directory:

```shell
cd client
npm start
```

At this point a browser should have appeared and loaded the administrative login
screen. Entering the credentials as defined by `ADMIN_USERNAME` and the contents
of `ADMIN_PASSWD_FILE` should display the configuration screen for the service.
