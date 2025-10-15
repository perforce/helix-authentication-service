#!/bin/bash
#
# Test package installation on RockyLinux 9.
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

# Turn off dnf cache maintenance that fires at exactly the wrong time and causes
# our tests to fail (c.f. https://bugzilla.redhat.com/show_bug.cgi?id=1814337).
#
# Disable and stop the timer and wait some arbitrary amount of time in the hopes
# that the dnf cache cleanup will not get in our way.
echo -e '\nDisabling the DNF cache timer...\n'
systemctl disable dnf-makecache.timer
systemctl stop dnf-makecache.timer
sleep 60

echo -e '\nInstalling helix-auth-svc package...\n'
tar zxf helix-auth-svc-centos9.tgz
yum -y install ./yum/rhel/9/x86_64/helix-auth-svc-*.rpm

# ensure the package is fully installed
rpm -qa helix-auth-svc | grep -q helix-auth-svc || { echo 'package install failed' ; exit 1; }

# ensure 'perforce' user and group are created
getent group perforce
getent passwd perforce

# ensure the package.json has the expected version string
grep -qE 'P4AS/noarch/20..\..+?/.+' /opt/perforce/helix-auth-svc/package.json || { echo 'package.json missing version' ; exit 1; }

# ensure certain files are present
echo -e '\nTesting for presence of certain files...\n'
test -f /opt/perforce/helix-auth-svc/.env
test -f /opt/perforce/helix-auth-svc/README.html
test -x /opt/perforce/helix-auth-svc/bin/configure-auth-service.sh
test -x /opt/perforce/helix-auth-svc/bin/node
/opt/perforce/helix-auth-svc/bin/node --version | grep -Eq '^v22\.' || { echo 'Node version wrong!'; exit 1; }
test -f /opt/perforce/helix-auth-svc/private/admin/assets/index-*.js

# ensure the systemd service is running
systemctl status helix-auth | grep 'Active: active' || { echo 'service not active' ; exit 1; }

# finally remove the package to make sure that does not fail horribly
echo -e '\nRemoving helix-auth-svc package...\n'
yum -y erase helix-auth-svc
test ! -f /etc/systemd/system/helix-auth.service
cat <<EOT

==============================================================================
PACKAGE TESTS PASSED
==============================================================================

EOT
