#!/bin/bash
#
# Test package installation on CentOS 7.
#
# Note that this test relies on systemd which requires a privileged container.
#
set -e

# ensure we can run systemd properly in this container
WAIT_COUNT=0
while ! systemctl list-units >/dev/null 2>&1; do
    WAIT_COUNT=$(($WAIT_COUNT + 1))
    if [[ $WAIT_COUNT -gt 10 ]]; then
        echo 'error: unable to run systemd!'
        exit 1
    fi
    sleep 1
done

echo -e '\nInstalling helix-auth-svc package...\n'
tar zxf helix-auth-svc-centos7.tgz
yum -y install ./yum/rhel/7/x86_64/helix-auth-svc-*.rpm

# ensure the package is fully installed
rpm -qa helix-auth-svc | grep -q helix-auth-svc || { echo 'package install failed' ; exit 1; }

# ensure 'perforce' user and group are created
getent group perforce
getent passwd perforce

# ensure the package.json has the expected version string
grep -qE 'HAS/noarch/20..\..+?/.+' /opt/perforce/helix-auth-svc/package.json || { echo 'package.json missing version' ; exit 1; }

# ensure certain files are present
echo -e '\nTesting for presence of certain files...\n'
test -f /opt/perforce/helix-auth-svc/.env
test -f /opt/perforce/helix-auth-svc/README.html
test -x /opt/perforce/helix-auth-svc/bin/configure-auth-service.sh
test -x /opt/perforce/helix-auth-svc/bin/node
test -f /opt/perforce/helix-auth-svc/public/admin/assets/index-*.js

# ensure the systemd service is running
systemctl status helix-auth | grep 'Active: active' || { echo 'service not active' ; exit 1; }

# finally remove the package to make sure that does not fail horribly
echo -e '\nRemoving helix-auth-svc package...\n'
yum -y erase helix-auth-svc
test ! -f /etc/systemd/system/helix-auth.service
echo -e '\nTest completed successfully!\n'
