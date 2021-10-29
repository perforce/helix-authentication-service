#!/bin/bash
#
# Test package installation on CentOS 8.
#
# Note that this test relies on systemd which requires a privileged container.
#
set -e

# ensure we can run systemd properly in this container
if ! systemctl list-units >/dev/null 2>&1; then
    echo 'error: unable to run systemd!'
    exit 1
fi

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
tar zxf helix-auth-svc-centos8.tgz
yum -y install ./yum/rhel/8/x86_64/helix-auth-svc-*.rpm

# ensure the package is fully installed
rpm -qa helix-auth-svc | grep -q helix-auth-svc

# ensure the package.json has the expected version string
grep -qE 'HAS/noarch/20..\..+?/.+' /opt/perforce/helix-auth-svc/package.json

# ensure certain files are present
echo -e '\nTesting for presence of certain files...\n'
test -f /opt/perforce/helix-auth-svc/README.html
test -x /opt/perforce/helix-auth-svc/bin/configure-auth-service.sh
test -f /opt/perforce/helix-auth-svc/bin/writeconf.cjs
test -x /opt/perforce/helix-auth-svc/bin/node

# ensure the systemd service is running
systemctl status helix-auth | grep 'Active: active'

# finally remove the package to make sure that does not fail horribly
echo -e '\nRemoving helix-auth-svc package...\n'
yum -y erase helix-auth-svc
echo -e '\nTest completed successfully!\n'
