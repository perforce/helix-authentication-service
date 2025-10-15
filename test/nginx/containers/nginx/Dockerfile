#
# Container for running nginx as a load balancer in front of P4AS.
#
# This serves as an example of running a load balancer in front of P4AS, while
# keeping the session cookie secure, despite running P4AS on http instead of
# https. Note that configuring P4AS to use http will mean that the certificate
# verification logic in /requests/status will be bypassed, allowing any client
# to request the user profile data.
#
FROM nginx:1.20

COPY mysite.crt /etc/nginx/ssl/mysite.crt
COPY mysite.key /etc/nginx/ssl/mysite.key
COPY nginx.conf /etc/nginx/nginx.conf
