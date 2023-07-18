# HAS Docker Containers

This document describes a setup for testing the authentication service using [Docker](https://www.docker.com), which is relatively easy to use, but comes with the cavaet that you will need to work through some complicated setup for container name resolution. Be sure to read through this entire document before attempting to use these containers.

## Setup

1. [Install](https://docs.docker.com/engine/install/) Docker
1. [Install](https://docs.docker.com/compose/install/) Docker Compose

### Container Name Resolution

The Docker containers have names that are used internally to find each other,
and since several of the containers are serving requests from the web browser,
the names must be resolvable by the system doing the testing. In order for the
test system to resolve these names, it may be helpful to install
[dnsmasq](http://www.thekelleys.org.uk/dnsmasq/doc.html). The easiest way to run
dnsmasq is via Docker.

```shell
$ echo 'address=/.doc/127.0.0.1' | sudo tee /etc/dnsmasq.conf
$ docker run --name dnsmasq -d -p 53:53/udp -p 5380:8080 \
    -v /etc/dnsmasq.conf:/etc/dnsmasq.conf \
    --log-opt 'max-size=1m'  -e 'HTTP_USER=admin' -e 'HTTP_PASS=admin' \
    --restart always jpillora/dnsmasq
```

If using a macOS system, the commands below will configure the host to use
dnsmasq for host name resolution:

```shell
$ sudo mkdir /etc/resolver
$ echo 'nameserver 127.0.0.1' | sudo tee /etc/resolver/doc
```

If using a systemd-based Linux desktop, this [page](https://sixfeetup.com/blog/local-development-with-wildcard-dns-on-linux) describes the steps for running dnsmasq and `systemd-resolved` together. Note that this only works for the desktop system itself, if you want other hosts to be able to use this system for DNS, you will need to disable the stub listener for `systemd-resolved` and rely directly on dnsmasq.

An alternative to using dnsmasq would be to hard-code the names in the `/etc/hosts` file, or configure a DNS server to resolve the names.

## Usage

Build and start the containers (from the parent directory) like so:

```shell
$ docker compose up --build -d
```
