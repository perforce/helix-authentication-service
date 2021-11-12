#!/bin/bash
#
# Test package installation on CentOS 7.
#
# Note that this test relies on systemd which requires a privileged container.
#
set -e

# ensure we can run systemd properly in this container
if ! systemctl list-units >/dev/null 2>&1; then
    echo 'error: unable to run systemd!'
    exit 1
fi

echo -e '\nInstalling helix-auth-svc package...\n'
tar zxf helix-auth-svc-centos7.tgz
yum -y install ./yum/rhel/7/x86_64/helix-auth-svc-*.rpm

# ensure the package is fully installed
rpm -qa helix-auth-svc | grep -q helix-auth-svc

# ensure 'perforce' user and group are created
getent group perforce
getent passwd perforce

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
test ! -f /etc/systemd/system/helix-auth.service
echo -e '\nTest completed successfully!\n'
