FROM rockylinux:8
#
# $ docker compose -f test/install/docker-compose.yml up --build -d centos_8_scim_test
# $ docker exec centos_8_scim_test su perforce /install_sh/test_scim_config.sh
# $ docker stop centos_8_scim_test
# $ docker rm centos_8_scim_test
#

# The docker base images are generally minimal, and our install and configure
# scripts have certain requirements, so install those now.
RUN yum -q -y install patch sudo which

ARG APT_URL="http://package.perforce.com/apt/ubuntu"
ARG PUB_KEY="http://package.perforce.com/perforce.pubkey"
ARG P4PORT="0.0.0.0:1666"

# install p4 and p4d using packages
RUN rpm --import http://package.perforce.com/perforce.pubkey
RUN echo -e '[perforce]\n\
name=Perforce\n\
baseurl=http://package.perforce.com/yum/rhel/8/x86_64\n\
enabled=1\n\
gpgcheck=1\n'\
>> /etc/yum.repos.d/perforce.repo
RUN yum -q -y install helix-cli helix-p4d

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
