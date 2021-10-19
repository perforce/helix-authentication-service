#
# Container for running Apache as a reverse proxy in front of HAS.
#
# This serves as an example of running a load balancer in front of HAS, while
# keeping the session cookie secure, despite running HAS on http instead of
# https. Note that configuring HAS to use http will mean that the certificate
# verification logic in /requests/status will be bypassed, allowing any client
# to request the user profile data.
#
FROM httpd:2.4

COPY mysite.crt /usr/local/apache2/conf/server.crt
COPY mysite.key /usr/local/apache2/conf/server.key
RUN sed -i \
        -e 's/^#\(Include .*httpd-ssl.conf\)/\1/' \
        -e 's/^#\(LoadModule .*mod_ssl.so\)/\1/' \
        -e 's/^#\(LoadModule .*mod_socache_shmcb.so\)/\1/' \
        /usr/local/apache2/conf/httpd.conf
RUN echo 'Include conf/auth-proxy.conf' >> /usr/local/apache2/conf/httpd.conf
COPY proxy.conf /usr/local/apache2/conf/auth-proxy.conf
