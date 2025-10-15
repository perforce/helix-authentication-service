FROM ubuntu:24.04
#
# $ docker compose -f test/install/docker-compose.yml up --build -d ubuntu_24_scim_test
# $ docker exec ubuntu_24_scim_test su perforce /install_sh/test_scim_config.sh
# $ docker stop ubuntu_24_scim_test
# $ docker rm ubuntu_24_scim_test
#
ARG APT_URL="http://package.perforce.com/apt/ubuntu"
ARG PUB_KEY="http://package.perforce.com/perforce.pubkey"
ARG P4PORT="0.0.0.0:1666"

# The docker base images are generally minimal, and our install and configure
# scripts have certain requirements, so install those now.
RUN apt-get -q update --fix-missing && \
    apt-get -q -y install curl gawk iputils-ping patch sudo systemd-sysv

# install p4 and p4d using packages
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && \
    apt-get -q -y install apt-utils lsb-release gnupg
ADD ${PUB_KEY} perforce.pubkey
RUN apt-key add perforce.pubkey && \
    rm -f perforce.pubkey
RUN echo "deb ${APT_URL} $(lsb_release -sc) release" > /etc/apt/sources.list.d/perforce.sources.list
RUN apt-get update && \
    apt-get -q -y install helix-cli helix-p4d

RUN /opt/perforce/sbin/configure-helix-p4d.sh -n -p ${P4PORT} -u super -P Rebar123 despot
RUN echo 'perforce ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/perforce

# The install and configure scripts want to run as non-root user, and npm
# expects a home directory that the user has permissions to write to. Also, the
# P4AS directory itself must be writable by the test user.
RUN mkdir /install_sh
WORKDIR /install_sh
COPY test/install/test_scim_config.sh .
COPY helix-authentication-service.tgz .
RUN chown perforce:perforce .
RUN sudo -u perforce tar zxf helix-authentication-service.tgz && \
    mv helix-authentication-service helix-auth-svc
RUN chown perforce:perforce *

ENV USER=perforce

# Start the init daemon (systemd) so that systemctl commands will run properly,
# and thus our installation script will be successful.
ENTRYPOINT [ "/sbin/init" ]
