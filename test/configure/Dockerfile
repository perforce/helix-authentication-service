FROM ubuntu:22.04
#
# $ docker build -f test/configure/Dockerfile --tag has_config_test .
# $ docker run -it --entrypoint /bin/bash has_config_test
#
# # su charlie
# $ bash
# [perform manual testing]
# 
# $ docker rm has_config_test
#

# The docker base images are generally minimal, and our install and configure
# scripts have certain requirements, so install those now.
ENV DEBIAN_FRONTEND noninteractive
RUN apt-get -q update --fix-missing && \
    apt-get -q -y install curl iputils-ping sudo systemd-sysv

# The install and configure scripts want to run as a non-root user, while
# systemd must run as root, so create the user for the test script to utilize,
# ensuring that user owns everything.
RUN useradd -m charlie
RUN echo 'charlie ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/charlie
WORKDIR /install_sh

# copy and extract the tarball from the previous build stage
COPY helix-authentication-service.tgz .
RUN tar zxf helix-authentication-service.tgz && \
    mv helix-authentication-service helix-auth-svc
COPY test/install/test_install_config.sh .
RUN chown -R charlie /install_sh

# Start the init daemon (systemd) so that systemctl commands will run properly,
# and thus our installation script will be successful.
ENTRYPOINT [ "/sbin/init" ]
