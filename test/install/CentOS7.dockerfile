FROM centos:7
#
# $ docker build -f test/install/CentOS7.dockerfile -t has-centos7-install .
# $ docker image ls | grep has-centos7-install
#

# The docker base images are generally minimal, and our install and configure
# scripts have certain requirements, so install those now.
RUN yum -q -y install sudo which

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
RUN ./helix-auth-svc/install.sh -n

# ensure node and pm2 have been installed as expected
RUN test -f /usr/bin/node
RUN test -f /usr/bin/pm2

# pm2 is not running during the build, but there is evidence that the service
# was started during the build
RUN test -f .pm2/logs/auth-svc-out.log

# run the configure script and set up OIDC
RUN ./helix-auth-svc/bin/configure-auth-service.sh -n \
    --base-url https://localhost:3000 \
    --oidc-issuer-uri https://oidc.issuer \
    --oidc-client-id client_id \
    --oidc-client-secret client_secret

# ensure configure script created the OIDC client secret file
RUN test -f helix-auth-svc/client-secret.txt && \
    grep -q 'client_secret' helix-auth-svc/client-secret.txt && \
    grep -q 'https://localhost:3000' helix-auth-svc/ecosystem.config.js && \
    grep -q 'https://oidc.issuer' helix-auth-svc/ecosystem.config.js

# run the configure script and set up SAML
RUN ./helix-auth-svc/bin/configure-auth-service.sh -n \
    --base-url https://localhost:3000 \
    --saml-idp-metadata-url https://saml.idp/metadata

RUN grep -q 'https://saml.idp/metadata' helix-auth-svc/ecosystem.config.js
