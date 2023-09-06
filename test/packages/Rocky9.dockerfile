FROM rockylinux:9 AS rocky9-sha1
#
# $ docker compose -f test/packages/docker-compose.yml up --build -d rocky_9_test
# $ docker exec rocky_9_test /packages/rocky9_pkg_exec.sh
# $ docker stop rocky_9_test
# $ docker rm rocky_9_test
#

# need to enable SHA1 support until NodeSource fixes their packages
# (c.f. https://github.com/nodesource/distributions/issues/1653)
RUN update-crypto-policies --set DEFAULT:SHA1

FROM rocky9-sha1
ENV container docker

# The docker base images are generally minimal, and our install and configure
# scripts have certain requirements, so install those now.
RUN yum -q -y install patch sudo systemd which

WORKDIR /packages

# copy the package tarball and test script
COPY test/packages/rocky9_pkg_exec.sh .
COPY helix-auth-svc-centos9.tgz .

# Start the init daemon (systemd) so that systemctl commands will run properly,
# and thus our package installation will be successful.
ENTRYPOINT [ "/usr/sbin/init" ]
