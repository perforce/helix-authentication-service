FROM centos:7
#
# Test the install when an older Node.js package is already installed.
#
# $ docker build -f test/install/CentOSup.dockerfile -t has-centosup-install .
# $ docker image ls | grep has-centosup-install
#

# The docker base images are generally minimal, and our install and configure
# scripts have certain requirements, so install those now.
RUN yum -q -y install sudo which

# install the previous LTS version of Node.js via package
ADD https://rpm.nodesource.com/setup_12.x setup_12.x
RUN bash setup_12.x
RUN yum -y install nodejs
RUN test -f /usr/bin/node

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
RUN ./helix-auth-svc/install.sh -n --pm2 --upgrade

# ensure new version of node has been installed as expected
RUN node --version | grep -Eq '^v14\.'
# and pm2 is installed
RUN test -f /usr/bin/pm2

# pm2 is not running during the build, but there is evidence that the service
# was started during the build
RUN test -f .pm2/logs/auth-svc-out.log

# run the configure script and set up OIDC
RUN ./helix-auth-svc/bin/configure-auth-service.sh -n --pm2 \
    --base-url https://localhost:3000 \
    --oidc-issuer-uri https://oidc.issuer \
    --oidc-client-id client_id \
    --oidc-client-secret client_secret

# ensure configure script created the OIDC client secret file
RUN test -f helix-auth-svc/client-secret.txt && \
    grep -q 'client_secret' helix-auth-svc/client-secret.txt && \
    grep -q '"script": "./bin/www.js",' helix-auth-svc/ecosystem.config.cjs && \
    grep -q '"LOGGING": "../logging.config.js",' helix-auth-svc/ecosystem.config.cjs && \
    grep -q 'https://localhost:3000' helix-auth-svc/ecosystem.config.cjs && \
    grep -q 'https://oidc.issuer' helix-auth-svc/ecosystem.config.cjs

# fabricate the single-binary executable condition to test configuration
RUN touch ./helix-auth-svc/helix-auth-svc && \
    chmod +x ./helix-auth-svc/helix-auth-svc && \
    rm -f helix-auth-svc/bin/www.js

# run the configure script and set up SAML
RUN ./helix-auth-svc/bin/configure-auth-service.sh -n --pm2 \
    --base-url https://localhost:3000 \
    --saml-idp-metadata-url https://saml.idp/metadata

# verify appropriate single-binary configuration in the pm2 file
RUN grep -q 'https://saml.idp/metadata' helix-auth-svc/ecosystem.config.cjs && \
    grep -q '"script": "./helix-auth-svc",' helix-auth-svc/ecosystem.config.cjs && \
    grep -q '"LOGGING": "/home/charlie/helix-auth-svc/logging.config.js",' helix-auth-svc/ecosystem.config.cjs
