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
./helix-auth-svc/install.sh -n --no-ping

# ensure latest version of node has been installed as expected
test -f /usr/bin/node
node --version | grep -Eq '^v24\.'

# ensure the .env file holding secrets is readable only by its owner (HAS-735)
test "$(sudo stat -c '%a' helix-auth-svc/.env)" = '600' || { echo '.env is not mode 600 after install' ; exit 1; }

# ensure the install script generated a unique session secret
sudo grep -q "^SESSION_SECRET=" helix-auth-svc/.env || { echo '.env missing SESSION_SECRET after install' ; exit 1; }
sudo grep -q "SESSION_SECRET='keyboard cat'" helix-auth-svc/.env && { echo '.env has default SESSION_SECRET after install' ; exit 1; }

# ensure the systemd service is running
sudo systemctl status helix-auth | grep -q 'Active: active' || { echo 'service not active' ; exit 1; }

# ensure the p4auth service account was created and owns the installation
getent group p4auth || { echo 'p4auth group missing' ; exit 1; }
getent passwd p4auth | grep -q ':/usr/sbin/nologin$' || { echo 'p4auth user missing or has a login shell' ; exit 1; }
test "$(stat -c '%U:%G' helix-auth-svc)" = 'p4auth:p4auth' || { echo 'installation not owned by p4auth' ; exit 1; }

# ensure the service is configured to, and does, drop privileges to p4auth
sudo grep -q '^SVC_USER=p4auth$' helix-auth-svc/.env || { echo '.env missing SVC_USER=p4auth' ; exit 1; }
sudo grep -q '^SVC_GROUP=p4auth$' helix-auth-svc/.env || { echo '.env missing SVC_GROUP=p4auth' ; exit 1; }
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

# run the configure script and set up OIDC
sudo -u p4auth ./helix-auth-svc/bin/configure-auth-service.sh -n \
    --base-url https://localhost:3000 \
    --oidc-issuer-uri https://oidc.issuer \
    --oidc-client-id client_id \
    --oidc-client-secret client_secret

# ensure configure script created the OIDC client secret file
test -f helix-auth-svc/.env || { echo 'missing .env configuration file' ; exit 1; }
test -f helix-auth-svc/client-secret.txt || { echo 'missing client secret file' ; exit 1; }
sudo -u p4auth grep -q 'client_secret' helix-auth-svc/client-secret.txt || { echo 'client secret missing' ; exit 1; }
sudo grep -q 'https://localhost:3000' helix-auth-svc/.env || { echo '.env missing URL' ; exit 1; }
sudo grep -q 'https://oidc.issuer' helix-auth-svc/.env || { echo '.env missing OIDC' ; exit 1; }
sudo grep -q 'SESSION_SECRET' helix-auth-svc/.env || { echo '.env missing SESSION_SECRET' ; exit 1; }
sudo grep -q "SESSION_SECRET='keyboard cat'" helix-auth-svc/.env && { echo '.env has default SESSION_SECRET' ; exit 1; }
test "$(sudo stat -c '%a' helix-auth-svc/.env)" = '600' || { echo '.env is not mode 600 after configure' ; exit 1; }
test -f helix-auth-svc/bearer-token.txt || { echo 'missing bearer token file' ; exit 1; }
sudo -u p4auth grep -q 'keyboard cat' helix-auth-svc/bearer-token.txt && { echo 'bearer token is default' ; exit 1; }

# run the configure script and set up SAML
sudo -u p4auth ./helix-auth-svc/bin/configure-auth-service.sh -n \
    --base-url https://localhost:3000 \
    --saml-idp-metadata-url https://saml.idp/metadata \
    --session-secret 'shared-test-secret'

test -f helix-auth-svc/.env || { echo 'missing .env configuration file' ; exit 1; }
sudo grep -q 'https://saml.idp/metadata' helix-auth-svc/.env || { echo '.env missing SAML' ; exit 1; }
sudo grep -q "SESSION_SECRET='shared-test-secret'" helix-auth-svc/.env || { echo '.env missing given SESSION_SECRET' ; exit 1; }

# run the configure script and set up web interface
sudo -u p4auth ./helix-auth-svc/bin/configure-auth-service.sh -n \
    --base-url https://localhost:3000 --enable-admin \
    --admin-user=scott --admin-passwd='keyboard cat'

test -f helix-auth-svc/.env || { echo 'missing .env configuration file' ; exit 1; }
sudo grep -q "ADMIN_ENABLED='true'" helix-auth-svc/.env || { echo '.env missing ADMIN_ENABLED' ; exit 1; }
sudo grep -q "ADMIN_USERNAME='scott'" helix-auth-svc/.env || { echo '.env missing ADMIN_USERNAME' ; exit 1; }
sudo grep -q 'ADMIN_PASSWD_FILE' helix-auth-svc/.env || { echo '.env missing ADMIN_PASSWD_FILE' ; exit 1; }

cat <<EOT

==============================================================================
INSTALL/CONFIGURE TESTS PASSED
==============================================================================

EOT
