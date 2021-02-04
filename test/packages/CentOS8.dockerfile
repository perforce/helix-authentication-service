FROM centos:8
#
# $ docker build -f test/packages/CentOS8.dockerfile -t has-centos8-test .
# $ docker image ls | grep has-centos8-test
#

# Package post-install expects a USER environment variable.
ENV USER=root

# The docker base images are generally minimal, and our package and its
# post-install script have certain requirements, so install those now.
RUN yum -q -y install sudo

# install node.js via package from nodesource
ADD https://rpm.nodesource.com/setup_14.x setup_14.x
RUN bash setup_14.x
RUN yum -y install nodejs
RUN test -f /usr/bin/node

# install our package using the tarball from the previous build stage
COPY helix-auth-svc-centos8.tgz .
RUN tar zxf helix-auth-svc-centos8.tgz
RUN yum -y install ./yum/rhel/8/x86_64/helix-auth-svc-*.rpm

# ensure the package is fully installed
RUN rpm -qa helix-auth-svc | grep -q helix-auth-svc

# ensure the package.json has the expected version string
RUN grep -qE 'HAS/noarch/20..\..+?/.+' /opt/perforce/helix-auth-svc/package.json

# ensure certain files are present
RUN test -f /opt/perforce/helix-auth-svc/README.html
RUN test -x /opt/perforce/helix-auth-svc/bin/configure-auth-service.sh
RUN test -f /opt/perforce/helix-auth-svc/bin/writeconf.js
RUN test -x /opt/perforce/helix-auth-svc/helix-auth-svc

# ensure the systemd service is running
#
# However, systemd cannot run in unprivileged containers, and worse, you cannot
# build a container in privileged mode, so forget anything to do with systemd.
#
# RUN systemctl status helix-auth | grep 'Active: active'

# finally remove the package to make sure that does not fail horribly
# (this fails because systemd)
# RUN yum -y erase helix-auth-svc
