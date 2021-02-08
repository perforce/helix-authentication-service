FROM ubuntu:20.04
#
# $ docker-compose -f test/packages/docker-compose.yml up --build -d ubuntu_20_test
# $ docker exec ubuntu_20_test /packages/ubuntu20_pkg_exec.sh
# $ docker stop ubuntu_20_test
#

# Package post-install expects a USER environment variable.
ENV USER=root

# The docker base images are generally minimal, and our package and its
# post-install script have certain requirements, so install those now.
RUN apt-get -q update --fix-missing && \
    apt-get -q -y install sudo systemd systemd-sysv

# install node.js via package from nodesource
ADD https://deb.nodesource.com/setup_14.x setup_14.x
RUN bash setup_14.x
RUN apt-get -q -y install nodejs
RUN test -f /usr/bin/node

WORKDIR /packages

# copy the package tarball and test script
COPY helix-auth-svc-ubuntu20.tgz .
COPY test/packages/ubuntu20_pkg_exec.sh .

# Start the init daemon (systemd) so that systemctl commands will run properly,
# and thus our package installation will be successful.
ENTRYPOINT [ "/sbin/init" ]
