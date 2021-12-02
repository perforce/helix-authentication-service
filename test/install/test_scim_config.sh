#!/usr/bin/env bash
#
# Start p4d and test configuring the user provisioning.
#
set -e

# ensure we can run systemd properly in this container
if ! sudo systemctl list-units >/dev/null 2>&1; then
    echo 'error: unable to run systemd!'
    exit 1
fi

# Turn off dnf cache maintenance that fires at exactly the wrong time and causes
# our tests to fail (c.f. https://bugzilla.redhat.com/show_bug.cgi?id=1814337).
if systemctl status dnf-makecache.timer >/dev/null 2>&1; then
    echo -e '\nDisabling the DNF cache timer...\n'
    sudo systemctl disable dnf-makecache.timer
    sudo systemctl stop dnf-makecache.timer
    sleep 60
fi

# p4d is already running
# p4dctl start -o '-p 0.0.0.0:1666' despot

# run the install script non-interactively
./helix-auth-svc/install.sh -n

./helix-auth-svc/bin/configure-auth-service.sh -n \
    --base-url https://localhost:3000 \
    --bearer-token 'keyboard cat' \
    --p4port 0.0.0.0:1666 --super super --superpassword Rebar123

grep -q 'a2V5Ym9hcmQgY2F0' helix-auth-svc/.env
grep -q '0.0.0.0:1666' helix-auth-svc/.env
grep -q 'Rebar123' helix-auth-svc/.env

cat <<EOT

==============================================================================
INSTALL/CONFIGURE TESTS PASSED
==============================================================================

EOT
