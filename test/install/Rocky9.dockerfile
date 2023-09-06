FROM rockylinux:9 AS rocky9-sha1
#
# $ docker compose -f test/install/docker-compose.yml up --build -d rocky_9_install_test
# $ docker exec rocky_9_install_test su charlie /install_sh/test_install_config.sh
# $ docker stop rocky_9_install_test
# $ docker rm rocky_9_install_test
#

# need to enable SHA1 support until NodeSource fixes their packages
# (c.f. https://github.com/nodesource/distributions/issues/1653)
RUN update-crypto-policies --set DEFAULT:SHA1

FROM rocky9-sha1
ENV container docker

# The docker base images are generally minimal, and our install and configure
# scripts have certain requirements, so install those now.
RUN yum -q -y install patch sudo systemd which

# The install and configure scripts want to run as a non-root user, while
# systemd must run as root, so create the user for the test script to utilize,
# ensuring that user owns everything.
RUN useradd -m charlie
RUN echo 'charlie ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/charlie
WORKDIR /install_sh

# copy and extract the tarball from the previous build stage
COPY helix-authentication-service.tgz .
RUN chown charlie:charlie .
RUN sudo -u charlie tar zxf helix-authentication-service.tgz && \
    mv helix-authentication-service helix-auth-svc
COPY test/install/test_install_config.sh .
RUN chown charlie:charlie *

# Start the init daemon (systemd) so that systemctl commands will run properly,
# and thus our installation script will be successful.
ENTRYPOINT [ "/usr/sbin/init" ]
