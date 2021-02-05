#!/bin/bash
#
# Test package installation on Ubuntu 18.
#
# Note that this test relies on systemd which requires a privileged container.
#
set -e

# ensure we can run systemd properly in this container
if ! systemctl list-units >/dev/null 2>&1; then
    echo 'error: unable to run systemd!'
    exit 1
fi

tar zxf helix-auth-svc-ubuntu18.tgz
apt install ./apt/ubuntu/bionic/incoming/helix-auth-svc_*.deb

# ensure the package is fully installed
dpkg-query -s helix-auth-svc | grep -q 'install ok installed'

# ensure the package.json has the expected version string
grep -qE 'HAS/noarch/20..\..+?/.+' /opt/perforce/helix-auth-svc/package.json

# ensure certain files are present
test -f /opt/perforce/helix-auth-svc/README.html
test -x /opt/perforce/helix-auth-svc/bin/configure-auth-service.sh
test -f /opt/perforce/helix-auth-svc/bin/writeconf.js
test -x /opt/perforce/helix-auth-svc/helix-auth-svc

# ensure the systemd service is running
systemctl status helix-auth | grep 'Active: active'

# finally remove the package to make sure that does not fail horribly
apt-get -q -y remove helix-auth-svc
