#!/bin/bash
#
# * Run the install.sh script tests that assume systemd is present.
# * Run the configure script and ensure it correctly modifies the .env file.
#
# Note that this test relies on systemd which requires a privileged container.
#
set -e

# ensure we can run systemd properly in this container
if ! sudo systemctl list-units >/dev/null 2>&1; then
    echo 'error: unable to run systemd!'
    exit 1
fi

# run the install script non-interactively
./helix-auth-svc/install.sh -n

grep -q 'User=perforce' /etc/systemd/system/helix-auth.service
grep -q 'Group=perforce' /etc/systemd/system/helix-auth.service

# ensure the systemd service is running
sudo systemctl status helix-auth | grep -q 'Active: active'

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
sudo -u perforce grep -q 'client_secret' helix-auth-svc/client-secret.txt
grep -q 'https://localhost:3000' helix-auth-svc/.env
grep -q 'https://oidc.issuer' helix-auth-svc/.env

# run the configure script and set up SAML
sudo -u perforce ./helix-auth-svc/bin/configure-auth-service.sh -n \
    --base-url https://localhost:3000 \
    --saml-idp-metadata-url https://saml.idp/metadata

grep -q 'https://saml.idp/metadata' helix-auth-svc/.env

cat <<EOT

==============================================================================
INSTALL/CONFIGURE TESTS PASSED
==============================================================================

EOT
