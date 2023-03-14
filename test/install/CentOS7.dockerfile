FROM centos:7
#
# $ docker compose -f test/install/docker-compose.yml up --build -d centos_7_install_test
# $ docker exec centos_7_install_test su charlie /install_sh/test_install_config.sh
# $ docker stop centos_7_install_test
# $ docker rm centos_7_install_test
#

# The docker base images are generally minimal, and our install and configure
# scripts have certain requirements, so install those now.
RUN yum -q -y install sudo systemd which

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
ENTRYPOINT [ "/sbin/init" ]
