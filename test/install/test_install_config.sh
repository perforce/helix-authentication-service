#!/bin/bash
#
# * Run the install.sh script tests that assume systemd is present.
# * Run the configure script and ensure it correctly modifies the .env file.
#
# Note that this test relies on systemd which requires a privileged container.
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

# run the install script non-interactively
./helix-auth-svc/install.sh -n

# ensure the systemd service is running
sudo systemctl status helix-auth | grep -q 'Active: active' || { echo 'service not active' ; exit 1; }

# for convenience in testing, let perforce have password-less sudo
sudo tee /etc/sudoers.d/perforce >/dev/null <<EOT
perforce ALL=(ALL) NOPASSWD:ALL
EOT

# run the configure script and set up OIDC
sudo -u perforce ./helix-auth-svc/bin/configure-auth-service.sh -n \
    --base-url https://localhost:3000 \
    --oidc-issuer-uri https://oidc.issuer \
    --oidc-client-id client_id \
    --oidc-client-secret client_secret

# ensure configure script created the OIDC client secret file
test -f helix-auth-svc/client-secret.txt
sudo -u perforce grep -q 'client_secret' helix-auth-svc/client-secret.txt || { echo 'client secret missing' ; exit 1; }
grep -q 'https://localhost:3000' helix-auth-svc/.env || { echo '.env missing URL' ; exit 1; }
grep -q 'https://oidc.issuer' helix-auth-svc/.env || { echo '.env missing OIDC' ; exit 1; }

# run the configure script and set up SAML
sudo -u perforce ./helix-auth-svc/bin/configure-auth-service.sh -n \
    --base-url https://localhost:3000 \
    --saml-idp-metadata-url https://saml.idp/metadata

grep -q 'https://saml.idp/metadata' helix-auth-svc/.env || { echo '.env missing SAML' ; exit 1; }

# run the configure script and set up web interface
sudo -u perforce ./helix-auth-svc/bin/configure-auth-service.sh -n \
    --base-url https://localhost:3000 --enable-admin \
    --admin-user=scott --admin-passwd=tiger

grep -q 'ADMIN_ENABLED=true' helix-auth-svc/.env || { echo '.env missing ADMIN_ENABLED' ; exit 1; }
grep -q 'ADMIN_USERNAME=scott' helix-auth-svc/.env || { echo '.env missing ADMIN_USERNAME' ; exit 1; }
grep -q 'ADMIN_PASSWD_FILE' helix-auth-svc/.env || { echo '.env missing ADMIN_PASSWD_FILE' ; exit 1; }

cat <<EOT

==============================================================================
INSTALL/CONFIGURE TESTS PASSED
==============================================================================

EOT
