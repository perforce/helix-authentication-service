#
# Docker container definition for publishing on Docker Hub.
#
# Build:
#
# $ docker build --pull -t helix-auth-svc:latest -t helix-auth-svc:2022.2 -f containers/hub/Dockerfile .
# $ docker tag helix-auth-svc:latest perforce/helix-auth-svc:latest
# $ docker tag helix-auth-svc:2022.2 perforce/helix-auth-svc:2022.2
# $ docker push --all-tags perforce/helix-auth-svc
#
# Run:
#
# $ docker run -d -p 3000:3000 --name helix-auth-svc helix-auth-svc:latest
#
FROM ubuntu:20.04 AS p4cli_base

ARG APT_URL="http://package.perforce.com/apt/ubuntu"
ARG PUB_KEY="http://package.perforce.com/perforce.pubkey"

#
# install p4 using packages to enable SCIM support
#
ENV DEBIAN_FRONTEND noninteractive
RUN apt-get update && \
    apt-get -q -y install apt-utils lsb-release gnupg
ADD ${PUB_KEY} perforce.pubkey
RUN apt-key add perforce.pubkey && \
    rm -f perforce.pubkey
RUN echo "deb ${APT_URL} $(lsb_release -sc) release" > /etc/apt/sources.list.d/perforce.sources.list
RUN apt-get update && \
    apt-get -q -y install helix-cli

#
# build the smallest feasible image for the service
#
FROM node:18-slim
ENV DEBIAN_FRONTEND noninteractive
RUN apt-get -q update --fix-missing && \
    apt-get -q -y install git
WORKDIR /srv
COPY bin bin
COPY certs certs
COPY defaults.env defaults.env
COPY lib lib
COPY package.json .
COPY package-lock.json .
COPY public public
COPY routes routes
COPY views views
RUN npm ci -q --only=prod --no-optional

# SCIM support requires a p4 client binary to be present
COPY --from=p4cli_base /opt/perforce/bin/p4 /usr/bin/p4

ENV CA_CERT_FILE certs/ca.crt
ENV DEBUG "yes"
ENV NODE_ENV development
ENV PORT 3000
ENV SVC_BASE_URI "https://localhost:3000"
EXPOSE ${PORT}
HEALTHCHECK CMD curl -k -f -s -I http://localhost:${PORT}/ || exit 1

ENTRYPOINT [ "node", "bin/www" ]
