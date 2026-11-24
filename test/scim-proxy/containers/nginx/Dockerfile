#
# Container for running nginx as a reverse proxy in front of P4AS.
#
FROM nginx:stable

COPY mysite.crt /etc/nginx/ssl/mysite.crt
COPY mysite.key /etc/nginx/ssl/mysite.key
COPY nginx.conf /etc/nginx/nginx.conf
