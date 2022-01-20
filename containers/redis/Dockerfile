#
# Secure Redis build that expects client certificiates
#
FROM redis:6.2
COPY redis.conf /usr/local/etc/redis/redis.conf
COPY redis.crt /usr/local/etc/redis/redis.crt
COPY redis.key /usr/local/etc/redis/redis.key
COPY ca.crt /usr/local/etc/redis/ca.crt
# client certs are for healthcheck
COPY client.crt /usr/local/etc/redis/client.crt
COPY client.key /usr/local/etc/redis/client.key
HEALTHCHECK CMD redis-cli -p 6389 --tls \
    --cert /usr/local/etc/redis/client.crt \
    --key /usr/local/etc/redis/client.key \
    --cacert /usr/local/etc/redis/ca.crt ping || exit 1
CMD [ "redis-server", "/usr/local/etc/redis/redis.conf" ]
