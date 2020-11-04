#
# Container for running HAProxy in front of HAS.
#
# This serves as an example of running a load balancer in front of HAS, while
# keeping the session cookie secure, despite running HAS on http instead of
# https. Note that configuring HAS to use http will mean that the certificate
# verification logic in /requests/status will be bypassed, allowing any client
# to request the user profile data. HAProxy can be configured to perform a
# similar function, if necessary.
#
# The mysite.pem is nothing more than the server.crt and server.key files
# concatenated into a single file.
#
FROM haproxy:2.2

COPY mysite.pem /etc/ssl/certs/mysite.pem
COPY haproxy.cfg /usr/local/etc/haproxy/haproxy.cfg
#
# haproxy -c fails on the Linux test systems because it cannot resolve the hosts
# for the service, but this nothing more than a preliminary check anyway.
#
# RUN haproxy -c -f /usr/local/etc/haproxy/haproxy.cfg
