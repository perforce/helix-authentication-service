#
# WIP container for running HAProxy in front of HAS.
#
# This serves as an example of running a load balancer in front of HAS, and
# keeping the session cookie secure, despite running HAS on http vs https.
# However, it does mean that the certificate verification logic in HAS is not
# being used at all, so this is only good as an example.
#
# Apply the changes in patch.diff, and make similar changes in the loginhook
# extension configuration, such that the clients reference auth-svc.doc without
# a port number. This will direct traffic to haproxy, which will then connect to
# HAS and manage the secure session cookie.
#
# $ patch -p 1 < containers/haproxy/patch.diff
#
# The mysite.pem is nothing more than the server.crt and server.key files
# concatenated into a single file.
#
FROM haproxy:2.2

COPY mysite.pem /etc/ssl/certs/mysite.pem
COPY haproxy.cfg /usr/local/etc/haproxy/haproxy.cfg
RUN haproxy -c -f /usr/local/etc/haproxy/haproxy.cfg
