FROM ubuntu:24.04
#
# $ docker compose -f test/packages/docker-compose.yml up --build -d ubuntu_24_test
# $ docker exec ubuntu_24_test /packages/ubuntu24_pkg_exec.sh
# $ docker stop ubuntu_24_test
# $ docker rm ubuntu_24_test
#

# Package post-install expects a USER environment variable.
ENV USER=root

# The docker base images are generally minimal, and our package and its
# post-install script have certain requirements, so install those now.
RUN apt-get -q update --fix-missing && \
    apt-get -q -y install sudo systemd systemd-sysv

WORKDIR /packages

# copy the package tarball and test script
COPY test/packages/ubuntu24_pkg_exec.sh .
COPY helix-auth-svc-ubuntu24.tgz .

# Start the init daemon (systemd) so that systemctl commands will run properly,
# and thus our package installation will be successful.
ENTRYPOINT [ "/sbin/init" ]
