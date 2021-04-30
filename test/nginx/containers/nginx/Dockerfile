#
# Container for running nginx as a load balancer in front of HAS.
#
# This serves as an example of running a load balancer in front of HAS, while
# keeping the session cookie secure, despite running HAS on http instead of
# https. Note that configuring HAS to use http will mean that the certificate
# verification logic in /requests/status will be bypassed, allowing any client
# to request the user profile data.
#
FROM nginx:1.20

COPY mysite.crt /etc/nginx/ssl/mysite.crt
COPY mysite.key /etc/nginx/ssl/mysite.key
COPY nginx.conf /etc/nginx/nginx.conf
