#
# Container for running HAProxy in front of P4AS.
#
# This serves as an example of running a load balancer in front of P4AS, while
# keeping the session cookie secure, despite running P4AS on http instead of
# https. HAProxy is configured to pass the client certificate to P4AS via a
# header and P4AS is configured to validate that cert by its fingerprint.
#
FROM haproxy:3.1

# Note that since version 2.4 the haproxy image has `USER haproxy` which makes
# it difficult to configure the server.
USER root

RUN mkdir -p /etc/ssl/certs
COPY certs/server.crt /etc/ssl/certs/server.crt
COPY certs/server.key /etc/ssl/certs/server.key
COPY certs/ca.crt /etc/ssl/certs/ca.crt
RUN cat /etc/ssl/certs/server.crt /etc/ssl/certs/server.key > /etc/ssl/certs/mysite.pem
COPY containers/haproxy/haproxy.cfg /usr/local/etc/haproxy/haproxy.cfg

# switch to unprivileged user
USER haproxy
#
# haproxy -c fails on the Linux test systems because it cannot resolve the hosts
# for the service, but this is nothing more than a preliminary check anyway.
#
# RUN haproxy -c -f /usr/local/etc/haproxy/haproxy.cfg
