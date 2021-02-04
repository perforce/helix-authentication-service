FROM ubuntu:20.04
#
# $ docker build -f test/packages/Ubuntu20.dockerfile -t has-ubuntu20-test .
# $ docker image ls | grep has-ubuntu20-test
#

# Package post-install expects a USER environment variable.
ENV USER=root

# The docker base images are generally minimal, and our package and its
# post-install script have certain requirements, so install those now.
RUN apt-get -q update
RUN apt-get -q -y install sudo systemd

# install node.js via package from nodesource
ADD https://deb.nodesource.com/setup_14.x setup_14.x
RUN bash setup_14.x
RUN apt-get -q -y install nodejs
RUN test -f /usr/bin/node

# install our package using the tarball from the previous build stage
COPY helix-auth-svc-ubuntu20.tgz .
RUN tar zxf helix-auth-svc-ubuntu20.tgz
RUN apt install ./apt/ubuntu/focal/incoming/helix-auth-svc_*.deb

# ensure the package is fully installed
RUN dpkg-query -s helix-auth-svc | grep -q 'install ok installed'

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
RUN apt-get -q -y remove helix-auth-svc
