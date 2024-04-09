#
# Secure valkey build that expects client certificiates
#
# (valkey is a fork of redis sponsored by the Linux Foundation)
#
FROM valkey/valkey:unstable
COPY valkey.conf /usr/local/etc/valkey/valkey.conf
COPY valkey.crt /usr/local/etc/valkey/valkey.crt
COPY valkey.key /usr/local/etc/valkey/valkey.key
COPY ca.crt /usr/local/etc/valkey/ca.crt
# client certs are for healthcheck
COPY client.crt /usr/local/etc/valkey/client.crt
COPY client.key /usr/local/etc/valkey/client.key
HEALTHCHECK CMD valkey-cli -p 6389 --tls \
    --cert /usr/local/etc/valkey/client.crt \
    --key /usr/local/etc/valkey/client.key \
    --cacert /usr/local/etc/valkey/ca.crt ping || exit 1
CMD [ "valkey-server", "/usr/local/etc/valkey/valkey.conf" ]
