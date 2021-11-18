FROM ubuntu:16.04
#
# $ docker compose -f test/packages/docker-compose.yml up --build -d ubuntu_16_test
# $ docker exec ubuntu_16_test /packages/ubuntu16_pkg_exec.sh
# $ docker stop ubuntu_16_test
# $ docker rm ubuntu_16_test
#

# The docker base images are generally minimal, and our package and its
# post-install script have certain requirements, so install those now.
RUN apt-get -q update --fix-missing && \
    apt-get -q -y install sudo

WORKDIR /packages

# copy the package tarball and test script
COPY test/packages/ubuntu16_pkg_exec.sh .
COPY helix-auth-svc-ubuntu16.tgz .

# Start the init daemon (systemd) so that systemctl commands will run properly,
# and thus our package installation will be successful.
ENTRYPOINT [ "/sbin/init" ]
