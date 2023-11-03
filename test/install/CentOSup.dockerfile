FROM rockylinux:8
#
# Test the install when an older Node.js package is already installed.
#
# $ docker build -f test/install/CentOSup.dockerfile -t has-centosup-install .
# $ docker image ls | grep has-centosup-install
#

# The docker base images are generally minimal, and our install and configure
# scripts have certain requirements, so install those now.
RUN yum -q -y install findutils sudo which

# install the previous LTS version of Node.js via package
RUN yum install -y https://rpm.nodesource.com/pub_18.x/nodistro/repo/nodesource-release-nodistro-1.noarch.rpm
RUN yum install -y --setopt=nodesource-nodejs.module_hotfixes=1 nodejs
RUN test -f /usr/bin/node
RUN node --version | grep -Eq '^v18\.'

# install (and configure) script(s) want to run as non-root user, and npm
# expects a home directory that the user has permissions to write to
RUN useradd -m charlie
RUN echo 'charlie ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/charlie
USER charlie
ENV USER=charlie
WORKDIR /home/charlie

# copy and extract the tarball from the previous build stage
COPY helix-authentication-service.tgz .
RUN tar zxf helix-authentication-service.tgz && \
    mv helix-authentication-service helix-auth-svc

# run the install script non-interactively
RUN ./helix-auth-svc/install.sh -n --no-create-user --no-systemd --upgrade

# ensure latest version of node has been installed as expected
RUN node --version | grep -Eq '^v20\.'

# run the configure script and set up OIDC
RUN ./helix-auth-svc/bin/configure-auth-service.sh -n \
    --base-url https://localhost:3000 \
    --oidc-issuer-uri https://oidc.issuer \
    --oidc-client-id client_id \
    --oidc-client-secret client_secret

# ensure configure script created the OIDC client secret file
RUN test -f helix-auth-svc/client-secret.txt && \
    grep -q 'client_secret' helix-auth-svc/client-secret.txt && \
    grep -q 'logging.config.cjs' helix-auth-svc/.env && \
    grep -q 'https://localhost:3000' helix-auth-svc/.env && \
    grep -q 'https://oidc.issuer' helix-auth-svc/.env
