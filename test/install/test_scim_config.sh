#!/bin/bash
#
# Start p4d and test configuring the user provisioning.
#
set -e

# ensure we can run systemd properly in this container
WAIT_COUNT=0
while ! sudo systemctl list-units >/dev/null 2>&1; do
    WAIT_COUNT=$(($WAIT_COUNT + 1))
    if [[ $WAIT_COUNT -gt 10 ]]; then
        echo 'error: unable to run systemd!'
        exit 1
    fi
    sleep 1
done

# Turn off dnf cache maintenance that fires at exactly the wrong time and causes
# our tests to fail (c.f. https://bugzilla.redhat.com/show_bug.cgi?id=1814337).
if systemctl status dnf-makecache.timer >/dev/null 2>&1; then
    echo -e '\nDisabling the DNF cache timer...\n'
    sudo systemctl disable dnf-makecache.timer
    sudo systemctl stop dnf-makecache.timer
    sleep 60
fi

# p4d is already running
p4dctl start -o '-p 0.0.0.0:1666' despot

# run the install script non-interactively
./helix-auth-svc/install.sh -n --no-ping

# ensure latest version of node has been installed as expected
test -f /usr/bin/node
node --version | grep -Eq '^v24\.'

# ensure the service is configured to, and does, drop privileges to p4auth
grep -q '^SVC_USER=p4auth$' helix-auth-svc/.env || { echo '.env missing SVC_USER=p4auth' ; exit 1; }
grep -q '^SVC_GROUP=p4auth$' helix-auth-svc/.env || { echo '.env missing SVC_GROUP=p4auth' ; exit 1; }
for i in $(seq 1 10); do
    SVC_PID=$(sudo systemctl show helix-auth -p MainPID --value)
    SVC_UID=$(sudo awk '/^Uid:/ {print $2}' /proc/${SVC_PID}/status 2>/dev/null)
    test "$SVC_UID" = "$(id -u p4auth)" && break
    sleep 1
done
test "$SVC_UID" = "$(id -u p4auth)" || { echo "service running as uid ${SVC_UID}, not p4auth" ; exit 1; }

# for convenience in testing, let p4auth have password-less sudo
sudo tee /etc/sudoers.d/p4auth >/dev/null <<EOT
p4auth ALL=(ALL) NOPASSWD:ALL
EOT

# configure _without_ SCIM to ensure P4 settings are _not_ in the .env file
sudo -u p4auth ./helix-auth-svc/bin/configure-auth-service.sh -n \
    --base-url https://localhost:3000 \
    --saml-idp-metadata-url https://saml.idp/metadata

test -f helix-auth-svc/.env || { echo 'missing .env configuration file' ; exit 1; }
grep -q 'https://saml.idp/metadata' helix-auth-svc/.env || { echo '.env missing SAML' ; exit 1; }
grep -q 'P4PORT' helix-auth-svc/.env && { echo '.env contains forbidden P4PORT' ; exit 1; }
grep -q 'P4PASSWD' helix-auth-svc/.env && { echo '.env contains forbidden P4PASSWD' ; exit 1; }
sudo rm helix-auth-svc/.env

sudo -u p4auth ./helix-auth-svc/bin/configure-auth-service.sh -n \
    --base-url https://localhost:3000 \
    --bearer-token 'keyboard cat' \
    --p4port 0.0.0.0:1666 --super super --superpassword Rebar123

test -f helix-auth-svc/.env || { echo 'missing .env configuration file' ; exit 1; }
grep -q 'BEARER_TOKEN' helix-auth-svc/.env || { echo '.env missing BEARER_TOKEN' ; exit 1; }
grep -q 'P4PORT' helix-auth-svc/.env || { echo '.env missing P4PORT' ; exit 1; }
grep -q 'P4PASSWD' helix-auth-svc/.env || { echo '.env missing P4PASSWD' ; exit 1; }

cat <<EOT

==============================================================================
INSTALL/CONFIGURE TESTS PASSED
==============================================================================

EOT
